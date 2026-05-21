package dev.zault.db;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserDatabaseServiceTest {

    private UserDatabaseService createService(Path tempDir, int maxConnections) throws Exception {
        // Create the template DB that the service expects to exist
        Path templatePath = tempDir.resolve(".template-user.db");
        if (!Files.exists(templatePath)) {
            try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + templatePath.toAbsolutePath());
                 Statement stmt = conn.createStatement()) {
                stmt.execute("PRAGMA journal_mode=WAL");
                stmt.execute("PRAGMA synchronous=NORMAL");
                stmt.execute("PRAGMA foreign_keys=ON");
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS user_db_meta (
                        key TEXT PRIMARY KEY, value TEXT NOT NULL)""");
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS investments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category TEXT NOT NULL,
                        amount NUMERIC NOT NULL CHECK (amount >= 0),
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_investments_category ON investments(category)");
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS tradebook_files (
                        id TEXT PRIMARY KEY, filename TEXT NOT NULL,
                        row_count INTEGER NOT NULL,
                        uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""");
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS trades (
                        trade_id TEXT PRIMARY KEY, file_id TEXT NOT NULL,
                        symbol TEXT NOT NULL, isin TEXT NOT NULL, trade_date TEXT NOT NULL,
                        exchange TEXT NOT NULL, segment TEXT NOT NULL, series TEXT NOT NULL,
                        trade_type TEXT NOT NULL, auction INTEGER NOT NULL,
                        quantity TEXT NOT NULL, price TEXT NOT NULL,
                        order_id TEXT NOT NULL, order_execution_time TEXT NOT NULL)""");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_trades_isin ON trades(isin)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_trades_file_id ON trades(file_id)");
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS allocations (
                        isin TEXT PRIMARY KEY, symbol TEXT NOT NULL,
                        net_quantity TEXT NOT NULL, invested_amount TEXT NOT NULL,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""");
            }
        }
        return new UserDatabaseService(tempDir.toString(), 5000, maxConnections, 30);
    }

    @Test
    void ensureUserDatabaseCreatesFileAndMetadata() throws Exception {
        Path tempDir = Files.createTempDirectory("zault-user-db-test-");
        UserDatabaseService service = createService(tempDir, 1000);
        String firstUserId = UUID.randomUUID().toString();
        String secondUserId = UUID.randomUUID().toString();
        String thirdUserId = UUID.randomUUID().toString();

        service.ensureUserDatabase(firstUserId);
        Path dbPath = service.getUserDatabasePath(firstUserId);

        assertTrue(Files.exists(dbPath), "Expected per-user SQLite DB file to be created");
        // Verify sharded directory structure: baseDir/xx/xx/uuid/user.db
        Path userDir = service.getUserDir(firstUserId);
        assertTrue(Files.isDirectory(userDir), "Expected per-user directory to exist");
        assertEquals(firstUserId + ".db", dbPath.getFileName().toString());
        assertTrue(dbPath.startsWith(userDir), "DB should be inside user directory");

        String createdAt = service.withUserConnection(firstUserId, connection -> {
            try (var statement = connection.prepareStatement("SELECT value FROM user_db_meta WHERE key = ?")) {
                statement.setString(1, "created_at");
                try (var rs = statement.executeQuery()) {
                    return rs.next() ? rs.getString(1) : null;
                }
            }
        });

        String investmentsTable = service.withUserConnection(firstUserId, connection -> {
            try (var statement = connection.prepareStatement(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'investments'")) {
                try (var rs = statement.executeQuery()) {
                    return rs.next() ? rs.getString(1) : null;
                }
            }
        });

        assertTrue(createdAt != null && !createdAt.isBlank(), "Expected created_at metadata in user DB");
        assertEquals("investments", investmentsTable, "Expected investments table in user DB schema");

        // Access another DB then the first one again to exercise LRU cache behavior.
        service.ensureUserDatabase(secondUserId);
        service.ensureUserDatabase(thirdUserId);
        String secondRead = service.withUserConnection(firstUserId, connection -> "ok");
        assertEquals("ok", secondRead);

        service.closeAll();
    }

    @Test
    void rejectsInvalidUuidUserIds() throws Exception {
        Path tempDir = Files.createTempDirectory("zault-user-db-invalid-id-test-");
        UserDatabaseService service = createService(tempDir, 1000);

        assertThrows(IllegalArgumentException.class, () -> service.ensureUserDatabase("../not-a-uuid"));

        service.closeAll();
    }

    @Test
    void evictsConnectionsWhenCacheExceedsMaxSize() throws Exception {
        Path tempDir = Files.createTempDirectory("zault-user-db-eviction-test-");
        UserDatabaseService service = createService(tempDir, 3);

        String[] userIds = new String[5];
        for (int i = 0; i < 5; i++) {
            userIds[i] = UUID.randomUUID().toString();
            service.ensureUserDatabase(userIds[i]);
        }

        String result = service.withUserConnection(userIds[0], connection -> {
            assertFalse(connection.isClosed(), "Returned connection should be open");
            return "ok";
        });
        assertEquals("ok", result);

        service.closeAll();
    }

    @Test
    void templateIsReusedAcrossMultipleUsers() throws Exception {
        Path tempDir = Files.createTempDirectory("zault-user-db-template-test-");
        UserDatabaseService service = createService(tempDir, 1000);

        assertTrue(Files.exists(tempDir.resolve(".template-user.db")), "Template DB should exist");

        for (int i = 0; i < 5; i++) {
            String userId = UUID.randomUUID().toString();
            service.ensureUserDatabase(userId);

            String tables = service.withUserConnection(userId, connection -> {
                try (var stmt = connection.prepareStatement(
                        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('user_db_meta', 'investments', 'tradebook_files', 'trades', 'allocations')")) {
                    try (var rs = stmt.executeQuery()) {
                        return rs.next() ? rs.getString(1) : "0";
                    }
                }
            });
            assertEquals("5", tables, "All 5 tables should exist in user DB");
        }

        service.closeAll();
    }

    @Test
    void failsIfTemplateDoesNotExist() {
        Path nonExistent = Path.of("/tmp/zault-no-template-" + System.nanoTime());
        assertThrows(IllegalStateException.class,
                () -> new UserDatabaseService(nonExistent.toString(), 5000, 1000, 30));
    }
}

