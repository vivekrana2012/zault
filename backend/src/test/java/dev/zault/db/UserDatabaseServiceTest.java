package dev.zault.db;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserDatabaseServiceTest {

    @Test
    void ensureUserDatabaseCreatesFileAndMetadata() throws Exception {
        Path tempDir = Files.createTempDirectory("zault-user-db-test-");
        UserDatabaseService service = new UserDatabaseService(tempDir.toString(), 2, 5000);

        service.ensureUserDatabase(42L);
        Path dbPath = service.getUserDatabasePath(42L);

        assertTrue(Files.exists(dbPath), "Expected per-user SQLite DB file to be created");

        String createdAt = service.withUserConnection(42L, connection -> {
            try (var statement = connection.prepareStatement("SELECT value FROM user_db_meta WHERE key = ?")) {
                statement.setString(1, "created_at");
                try (var rs = statement.executeQuery()) {
                    return rs.next() ? rs.getString(1) : null;
                }
            }
        });

        assertTrue(createdAt != null && !createdAt.isBlank(), "Expected created_at metadata in user DB");

        // Access another DB then the first one again to exercise LRU cache behavior.
        service.ensureUserDatabase(7L);
        service.ensureUserDatabase(9L);
        String secondRead = service.withUserConnection(42L, connection -> "ok");
        assertEquals("ok", secondRead);

        service.closeAll();
    }
}

