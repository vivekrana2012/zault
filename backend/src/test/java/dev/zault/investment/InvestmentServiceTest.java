package dev.zault.investment;

import dev.zault.db.UserDatabaseService;
import dev.zault.security.AuthenticatedUserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.nio.file.Files;
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
        var userDbService = new UserDatabaseService(tempDir.toString(), 4, 5000);
        var investmentService = new InvestmentService(userDbService);
        String firstUserId = UUID.randomUUID().toString();
        String secondUserId = UUID.randomUUID().toString();

        setAuthenticatedUser(firstUserId, Set.of("db:read", "db:write"));
        var first = investmentService.createInvestment(new CreateInvestmentRequest("Stocks", new BigDecimal("1000.00")));
        var second = investmentService.createInvestment(new CreateInvestmentRequest("PPF", new BigDecimal("250.50")));

        var listBeforePatch = investmentService.listInvestments();
        assertEquals(2, listBeforePatch.size());

        var updated = investmentService.updateAmount(first.id(), new UpdateInvestmentAmountRequest(new BigDecimal("1500.00")));
        assertTrue(updated.isPresent());
        assertEquals(0, updated.get().amount().compareTo(new BigDecimal("1500.00")));

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
        var userDbService = new UserDatabaseService(tempDir.toString(), 2, 5000);
        var investmentService = new InvestmentService(userDbService);

        setAuthenticatedUser(UUID.randomUUID().toString(), Set.of("db:read", "db:write"));

        assertThrows(IllegalArgumentException.class,
                () -> investmentService.createInvestment(new CreateInvestmentRequest(" ", new BigDecimal("10.00"))));
        assertThrows(IllegalArgumentException.class,
                () -> investmentService.createInvestment(new CreateInvestmentRequest("Savings", new BigDecimal("-1"))));
        assertThrows(IllegalArgumentException.class,
                () -> investmentService.createInvestment(new CreateInvestmentRequest("Savings", new BigDecimal("1.999"))));

        userDbService.closeAll();
    }

    private void setAuthenticatedUser(String userId, Set<String> scopes) {
        var principal = new AuthenticatedUserPrincipal("user-" + userId, userId, scopes);
        var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}



