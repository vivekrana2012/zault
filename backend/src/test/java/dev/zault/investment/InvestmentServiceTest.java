package dev.zault.investment;

import dev.zault.db.UserDatabaseService;
import dev.zault.security.AuthenticatedUserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class InvestmentServiceTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void crudOperationsAreScopedPerUser() throws Exception {
        var tempDir = Files.createTempDirectory("zault-investments-test-");
        createTemplateDb(tempDir);
        var userDbService = new UserDatabaseService(tempDir.toString(), 5000, 1000, 30);
        var investmentService = new InvestmentService(userDbService);
        String firstUserId = UUID.randomUUID().toString();
        String secondUserId = UUID.randomUUID().toString();

        setAuthenticatedUser(firstUserId, Set.of("db:read", "db:write"));
        var first = investmentService.createInvestment(new CreateInvestmentRequest("Stocks", new BigDecimal("1000.1234")));
        var second = investmentService.createInvestment(new CreateInvestmentRequest("PPF", new BigDecimal("250.50")));

        var listBeforePatch = investmentService.listInvestments();
        assertEquals(2, listBeforePatch.size());

        var updated = investmentService.updateAmount(first.id(), new UpdateInvestmentAmountRequest(new BigDecimal("1500.4321")));
        assertTrue(updated.isPresent());
        assertEquals(0, updated.get().amount().compareTo(new BigDecimal("1500.4321")));

        assertTrue(investmentService.deleteInvestment(second.id()));
        assertEquals(1, investmentService.listInvestments().size());

        setAuthenticatedUser(secondUserId, Set.of("db:read", "db:write"));
        assertTrue(investmentService.listInvestments().isEmpty());
        assertTrue(investmentService.updateAmount(first.id(), new UpdateInvestmentAmountRequest(new BigDecimal("1.00"))).isEmpty());

        var userTwoRow = investmentService.createInvestment(new CreateInvestmentRequest("NPS", new BigDecimal("99.99")));
        assertNotNull(userTwoRow.id());
        assertEquals(List.of(userTwoRow), investmentService.listInvestments());

        setAuthenticatedUser(firstUserId, Set.of("db:read", "db:write"));
        assertEquals(1, investmentService.listInvestments().size());

        userDbService.closeAll();
    }

    @Test
    void createRejectsInvalidAmountAndCategory() throws Exception {
        var tempDir = Files.createTempDirectory("zault-investments-validation-test-");
        createTemplateDb(tempDir);
        var userDbService = new UserDatabaseService(tempDir.toString(), 5000, 1000, 30);
        var investmentService = new InvestmentService(userDbService);

        setAuthenticatedUser(UUID.randomUUID().toString(), Set.of("db:read", "db:write"));

        assertThrows(IllegalArgumentException.class,
                () -> investmentService.createInvestment(new CreateInvestmentRequest(" ", new BigDecimal("10.00"))));
        assertThrows(IllegalArgumentException.class,
                () -> investmentService.createInvestment(new CreateInvestmentRequest("Savings", new BigDecimal("-1"))));
        var created = investmentService.createInvestment(new CreateInvestmentRequest("Savings", new BigDecimal("1.9999")));
        assertEquals(0, created.amount().compareTo(new BigDecimal("1.9999")));
        assertThrows(IllegalArgumentException.class,
                () -> investmentService.createInvestment(new CreateInvestmentRequest("Savings", new BigDecimal("1.99999"))));

        userDbService.closeAll();
    }

    private void setAuthenticatedUser(String userId, Set<String> scopes) {
        var principal = new AuthenticatedUserPrincipal("user-" + userId, userId, scopes);
        var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private static void createTemplateDb(Path dir) throws Exception {
        Path templatePath = dir.resolve(".template-user.db");
        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + templatePath.toAbsolutePath());
             Statement stmt = conn.createStatement()) {
            stmt.execute("PRAGMA journal_mode=WAL");
            stmt.execute("CREATE TABLE IF NOT EXISTS user_db_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS investments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL,
                    amount NUMERIC NOT NULL CHECK (amount >= 0),
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""");
            stmt.execute("CREATE INDEX IF NOT EXISTS idx_investments_category ON investments(category)");
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS tradebook_files (
                    id TEXT PRIMARY KEY, filename TEXT NOT NULL,
                    row_count INTEGER NOT NULL, uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""");
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
}
