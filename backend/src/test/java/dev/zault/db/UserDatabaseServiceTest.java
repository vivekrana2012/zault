package dev.zault.db;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserDatabaseServiceTest {

    @Test
    void ensureUserDatabaseCreatesFileAndMetadata() throws Exception {
        Path tempDir = Files.createTempDirectory("zault-user-db-test-");
        UserDatabaseService service = new UserDatabaseService(tempDir.toString(), 2, 5000);
        String firstUserId = UUID.randomUUID().toString();
        String secondUserId = UUID.randomUUID().toString();
        String thirdUserId = UUID.randomUUID().toString();

        service.ensureUserDatabase(firstUserId);
        Path dbPath = service.getUserDatabasePath(firstUserId);

        assertTrue(Files.exists(dbPath), "Expected per-user SQLite DB file to be created");

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
        UserDatabaseService service = new UserDatabaseService(tempDir.toString(), 2, 5000);

        assertThrows(IllegalArgumentException.class, () -> service.ensureUserDatabase("../not-a-uuid"));

        service.closeAll();
    }
}

