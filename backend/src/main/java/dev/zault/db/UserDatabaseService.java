package dev.zault.db;

import dev.zault.security.AuthenticatedUserPrincipal;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserDatabaseService {

    private static final Logger log = LoggerFactory.getLogger(UserDatabaseService.class);

    private final Path baseDir;
    private final int maxOpenConnections;
    private final int busyTimeoutMs;
    private final Map<String, Connection> connectionCache = new LinkedHashMap<>(16, 0.75f, true);
    private final Set<String> initializedUserIds = ConcurrentHashMap.newKeySet();

    public UserDatabaseService(
            @Value("${zault.user-db.base-dir:./user-dbs}") String baseDir,
            @Value("${zault.user-db.max-open-connections:32}") int maxOpenConnections,
            @Value("${zault.user-db.busy-timeout-ms:5000}") int busyTimeoutMs) {
        this.baseDir = Path.of(baseDir);
        this.maxOpenConnections = Math.max(1, maxOpenConnections);
        this.busyTimeoutMs = Math.max(1000, busyTimeoutMs);
    }

    public void ensureUserDatabase(String userId) {
        withUserConnection(userId, connection -> null);
    }

    public <T> T withCurrentUserDatabase(String requiredScope, SqlFunction<Connection, T> callback) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal)) {
            throw new AccessDeniedException("No authenticated user available");
        }

        if (!principal.hasScope(requiredScope)) {
            throw new AccessDeniedException("Missing required scope: " + requiredScope);
        }

        return withUserConnection(principal.userId(), callback);
    }

    public synchronized Path getUserDatabasePath(String userId) {
        return baseDir.resolve(normalizeUserId(userId) + ".db");
    }

    public <T> T withUserConnection(String userId, SqlFunction<Connection, T> callback) {
        String normalizedUserId = normalizeUserId(userId);
        Connection connection;
        synchronized (this) {
            connection = getOrCreateConnection(normalizedUserId);
        }

        synchronized (connection) {
            try {
                ensureInitialized(normalizedUserId, connection);
                return callback.apply(connection);
            } catch (SQLException e) {
                throw new IllegalStateException("Failed to execute user DB operation for user " + normalizedUserId, e);
            }
        }
    }

    @PreDestroy
    public synchronized void closeAll() {
        for (Connection connection : connectionCache.values()) {
            closeQuietly(connection);
        }
        connectionCache.clear();
        initializedUserIds.clear();
    }

    private synchronized Connection getOrCreateConnection(String userId) {
        Connection existing = connectionCache.get(userId);
        if (existing != null) {
            if (isConnectionHealthy(existing)) {
                return existing;
            }
            connectionCache.remove(userId);
            closeQuietly(existing);
        }

        Connection created = openConnection(userId);
        connectionCache.put(userId, created);

        if (connectionCache.size() > maxOpenConnections) {
            String eldestKey = connectionCache.keySet().iterator().next();
            Connection evicted = connectionCache.remove(eldestKey);
            closeQuietly(evicted);
            log.debug("Evicted user DB connection for userId={}", eldestKey);
        }

        return created;
    }

    private Connection openConnection(String userId) {
        Path dbPath = getUserDatabasePath(userId);
        try {
            Files.createDirectories(baseDir);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to create user DB directory: " + baseDir, e);
        }

        try {
            Connection connection = DriverManager.getConnection("jdbc:sqlite:" + dbPath.toAbsolutePath());
            applyPragmas(connection);
            return connection;
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to open user DB: " + dbPath, e);
        }
    }

    private void ensureInitialized(String userId, Connection connection) throws SQLException {
        if (initializedUserIds.contains(userId)) {
            return;
        }
        initializeSchema(connection);
        initializedUserIds.add(userId);
    }

    private String normalizeUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("User ID must not be blank");
        }
        try {
            return UUID.fromString(userId.trim()).toString();
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("User ID must be a valid UUID", e);
        }
    }

    private boolean isConnectionHealthy(Connection connection) {
        try {
            if (connection.isClosed()) {
                return false;
            }
            try (Statement statement = connection.createStatement()) {
                statement.execute("SELECT 1");
            }
            return true;
        } catch (SQLException e) {
            return false;
        }
    }

    private void applyPragmas(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=NORMAL");
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=" + busyTimeoutMs);
        }
    }

    private void initializeSchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE IF NOT EXISTS user_db_meta (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL
                    )
                    """);
            statement.execute("""
                    INSERT OR IGNORE INTO user_db_meta (key, value)
                    VALUES ('created_at', CURRENT_TIMESTAMP)
                    """);
            statement.execute("""
                    CREATE TABLE IF NOT EXISTS investments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category TEXT NOT NULL,
                        amount NUMERIC NOT NULL CHECK (amount >= 0),
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """);
            statement.execute("""
                    CREATE INDEX IF NOT EXISTS idx_investments_category
                    ON investments(category)
                    """);

            // Tradebook tables
            statement.execute("""
                    CREATE TABLE IF NOT EXISTS tradebook_files (
                        id TEXT PRIMARY KEY,
                        filename TEXT NOT NULL,
                        row_count INTEGER NOT NULL,
                        uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """);
            statement.execute("""
                    CREATE TABLE IF NOT EXISTS trades (
                        trade_id TEXT PRIMARY KEY,
                        file_id TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        isin TEXT NOT NULL,
                        trade_date TEXT NOT NULL,
                        exchange TEXT NOT NULL,
                        segment TEXT NOT NULL,
                        series TEXT NOT NULL,
                        trade_type TEXT NOT NULL,
                        auction INTEGER NOT NULL,
                        quantity TEXT NOT NULL,
                        price TEXT NOT NULL,
                        order_id TEXT NOT NULL,
                        order_execution_time TEXT NOT NULL
                    )
                    """);
            statement.execute("""
                    CREATE INDEX IF NOT EXISTS idx_trades_isin
                    ON trades(isin)
                    """);
            statement.execute("""
                    CREATE INDEX IF NOT EXISTS idx_trades_file_id
                    ON trades(file_id)
                    """);
            statement.execute("""
                    CREATE TABLE IF NOT EXISTS allocations (
                        isin TEXT PRIMARY KEY,
                        symbol TEXT NOT NULL,
                        net_quantity TEXT NOT NULL,
                        invested_amount TEXT NOT NULL,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """);
        }
    }

    private void closeQuietly(Connection connection) {
        if (connection == null) {
            return;
        }
        try {
            connection.close();
        } catch (SQLException e) {
            log.warn("Failed to close user DB connection", e);
        }
    }

    @FunctionalInterface
    public interface SqlFunction<T, R> {
        R apply(T input) throws SQLException;
    }
}

