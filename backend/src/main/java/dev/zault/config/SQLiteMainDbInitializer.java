package dev.zault.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Component
public class SQLiteMainDbInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SQLiteMainDbInitializer.class);

    private final DataSource dataSource;

    public SQLiteMainDbInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=NORMAL");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA foreign_keys=ON");
            log.info("Configured SQLite main DB pragmas (WAL, NORMAL, busy_timeout, foreign_keys)");
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to configure SQLite pragmas for main DB", e);
        }
    }
}

