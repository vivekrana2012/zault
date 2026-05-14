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
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserDatabaseService {

    private static final Logger log = LoggerFactory.getLogger(UserDatabaseService.class);

    private final Path baseDir;
    private final int maxOpenConnections;
    private final int busyTimeoutMs;
    private final Map<Long, Connection> connectionCache = new LinkedHashMap<>(16, 0.75f, true);
    private final Set<Long> initializedUserIds = ConcurrentHashMap.newKeySet();

    public UserDatabaseService(
            @Value("${zault.user-db.base-dir:./user-dbs}") String baseDir,
            @Value("${zault.user-db.max-open-connections:32}") int maxOpenConnections,
            @Value("${zault.user-db.busy-timeout-ms:5000}") int busyTimeoutMs) {
        this.baseDir = Path.of(baseDir);
        this.maxOpenConnections = Math.max(1, maxOpenConnections);
        this.busyTimeoutMs = Math.max(1000, busyTimeoutMs);
    }

    public void ensureUserDatabase(Long userId) {
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

    public synchronized Path getUserDatabasePath(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("User ID must be a positive number");
        }
        return baseDir.resolve(userId + ".db");
    }

    public <T> T withUserConnection(Long userId, SqlFunction<Connection, T> callback) {
        Connection connection;
        synchronized (this) {
            connection = getOrCreateConnection(userId);
        }

        synchronized (connection) {
            try {
                ensureInitialized(userId, connection);
                return callback.apply(connection);
            } catch (SQLException e) {
                throw new IllegalStateException("Failed to execute user DB operation for user " + userId, e);
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

    private synchronized Connection getOrCreateConnection(Long userId) {
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
            Long eldestKey = connectionCache.keySet().iterator().next();
            Connection evicted = connectionCache.remove(eldestKey);
            closeQuietly(evicted);
            log.debug("Evicted user DB connection for userId={}", eldestKey);
        }

        return created;
    }

    private Connection openConnection(Long userId) {
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

    private void ensureInitialized(Long userId, Connection connection) throws SQLException {
        if (initializedUserIds.contains(userId)) {
            return;
        }
        initializeSchema(connection);
        initializedUserIds.add(userId);
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

