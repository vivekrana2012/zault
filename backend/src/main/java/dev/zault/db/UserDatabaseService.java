package dev.zault.db;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.RemovalCause;
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
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class UserDatabaseService {

    private static final Logger log = LoggerFactory.getLogger(UserDatabaseService.class);
    private static final String TEMPLATE_DB_NAME = ".template-user.db";
    // DB filename includes the UUID to prevent accidental cross-user reads
    private static final String DB_EXTENSION = ".db";

    private final Path baseDir;
    private final Path templatePath;
    private final int busyTimeoutMs;
    private final Cache<String, Connection> connectionCache;

    public UserDatabaseService(
            @Value("${zault.user-db.base-dir:./user-dbs}") String baseDir,
            @Value("${zault.user-db.busy-timeout-ms:5000}") int busyTimeoutMs,
            @Value("${zault.user-db.max-connections:1000}") int maxConnections,
            @Value("${zault.user-db.idle-timeout-minutes:30}") int idleTimeoutMinutes) {
        this.baseDir = Path.of(baseDir);
        this.templatePath = this.baseDir.resolve(TEMPLATE_DB_NAME);
        this.busyTimeoutMs = Math.max(1000, busyTimeoutMs);

        this.connectionCache = Caffeine.newBuilder()
                .maximumSize(maxConnections)
                .expireAfterAccess(idleTimeoutMinutes, TimeUnit.MINUTES)
                .removalListener((String key, Connection connection, RemovalCause cause) -> {
                    log.debug("Evicting connection for user {} (cause: {})", key, cause);
                    closeQuietly(connection);
                })
                .build();

        if (!Files.exists(templatePath)) {
            throw new IllegalStateException(
                    "Template user DB not found at " + templatePath.toAbsolutePath()
                            + ". Run scripts/create-template-db.sh first.");
        }
        log.info("Using template user DB: {}", templatePath.toAbsolutePath());
    }

    public void ensureUserDatabase(String userId) {
        String normalizedUserId = normalizeUserId(userId);
        Path dbPath = getUserDbPath(normalizedUserId);
        if (Files.exists(dbPath)) {
            return;
        }
        try {
            Files.createDirectories(dbPath.getParent());
            Files.copy(templatePath, dbPath, StandardCopyOption.COPY_ATTRIBUTES);
            // Maybe this is an overhead with a dedicated connection just for one insert that too without caching.
            // Stamp created_at for this specific user.
            try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + dbPath.toAbsolutePath())) {
                applyPragmas(conn);
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("INSERT OR IGNORE INTO user_db_meta (key, value) VALUES ('created_at', CURRENT_TIMESTAMP)");
                }
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to create user DB from template: " + dbPath, e);
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to stamp user DB metadata: " + dbPath, e);
        }
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

    public Path getUserDatabasePath(String userId) {
        return getUserDbPath(normalizeUserId(userId));
    }

    /**
     * Returns the user's directory (for storing additional per-user files).
     */
    public Path getUserDir(String userId) {
        String normalized = normalizeUserId(userId);
        String hex = normalized.replace("-", "");
        return baseDir
                .resolve(hex.substring(0, 2))
                .resolve(hex.substring(2, 4))
                .resolve(normalized);
    }

    public <T> T withUserConnection(String userId, SqlFunction<Connection, T> callback) {
        String normalizedUserId = normalizeUserId(userId);
        Connection connection = connectionCache.get(normalizedUserId, this::openConnection);

        // Health check: if stale, invalidate and get a fresh connection
        if (!isConnectionHealthy(connection)) {
            connectionCache.invalidate(normalizedUserId);
            connection = connectionCache.get(normalizedUserId, this::openConnection);
        }

        try {
            return callback.apply(connection);
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to execute user DB operation for user " + normalizedUserId, e);
        }
    }

    @PreDestroy
    public void closeAll() {
        connectionCache.invalidateAll();
        connectionCache.cleanUp();
    }

    private Path getUserDbPath(String normalizedUserId) {
        String hex = normalizedUserId.replace("-", "");
        return baseDir
                .resolve(hex.substring(0, 2))
                .resolve(hex.substring(2, 4))
                .resolve(normalizedUserId)
                .resolve(normalizedUserId + DB_EXTENSION);
    }

    private Connection openConnection(String userId) {
        Path dbPath = getUserDbPath(userId);

        // If DB doesn't exist yet (edge case: connection requested before ensureUserDatabase)
        if (!Files.exists(dbPath)) {
            ensureUserDatabase(userId);
        }

        try {
            Connection connection = DriverManager.getConnection("jdbc:sqlite:" + dbPath.toAbsolutePath());
            applyPragmas(connection);
            return connection;
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to open user DB: " + dbPath, e);
        }
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
            return connection != null && !connection.isClosed();
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
