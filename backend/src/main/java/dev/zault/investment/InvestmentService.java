package dev.zault.investment;

import dev.zault.db.UserDatabaseService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class InvestmentService {

    private static final int MAX_CATEGORY_LENGTH = 100;
    private static final int MAX_AMOUNT_SCALE = 4;

    private final UserDatabaseService userDatabaseService;

    public InvestmentService(UserDatabaseService userDatabaseService) {
        this.userDatabaseService = userDatabaseService;
    }

    public List<InvestmentDto> listInvestments() {
        return userDatabaseService.withCurrentUserDatabase("db:read", connection -> {
            List<InvestmentDto> items = new ArrayList<>();

            // TODO: should we have a query file where we put all SQL queries to improve readability ?
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT id, category, amount FROM investments ORDER BY id ASC");
                 ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    items.add(mapRow(resultSet));
                }
            }

            return items;
        });
    }

    public InvestmentDto createInvestment(CreateInvestmentRequest request) {
        String category = normalizeCategory(request == null ? null : request.category());
        BigDecimal amount = normalizeAmount(request == null ? null : request.amount());

        return userDatabaseService.withCurrentUserDatabase("db:write", connection -> {
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO investments(category, amount, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    Statement.RETURN_GENERATED_KEYS)) {
                statement.setString(1, category);
                statement.setString(2, amount.toPlainString());
                statement.executeUpdate();

                try (ResultSet generatedKeys = statement.getGeneratedKeys()) {
                    if (!generatedKeys.next()) {
                        throw new IllegalStateException("Failed to create investment row");
                    }
                    long id = generatedKeys.getLong(1);
                    return new InvestmentDto(id, category, amount);
                }
            }
        });
    }

    public Optional<InvestmentDto> updateAmount(Long id, UpdateInvestmentAmountRequest request) {
        long investmentId = validateId(id);
        BigDecimal amount = normalizeAmount(request == null ? null : request.amount());

        return userDatabaseService.withCurrentUserDatabase("db:write", connection -> {
            try (PreparedStatement statement = connection.prepareStatement(
                    "UPDATE investments SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")) {
                statement.setString(1, amount.toPlainString());
                statement.setLong(2, investmentId);
                int updatedRows = statement.executeUpdate();
                if (updatedRows == 0) {
                    return Optional.empty();
                }
            }

            try (PreparedStatement fetch = connection.prepareStatement(
                    "SELECT id, category, amount FROM investments WHERE id = ?")) {
                fetch.setLong(1, investmentId);
                try (ResultSet resultSet = fetch.executeQuery()) {
                    if (!resultSet.next()) {
                        return Optional.empty();
                    }
                    return Optional.of(mapRow(resultSet));
                }
            }
        });
    }

    public boolean deleteInvestment(Long id) {
        long investmentId = validateId(id);

        return userDatabaseService.withCurrentUserDatabase("db:write", connection -> {
            try (PreparedStatement statement = connection.prepareStatement(
                    "DELETE FROM investments WHERE id = ?")) {
                statement.setLong(1, investmentId);
                return statement.executeUpdate() > 0;
            }
        });
    }

    private long validateId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("Investment ID must be a positive number");
        }
        return id;
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("Category is required");
        }
        String normalized = category.trim();
        if (normalized.length() > MAX_CATEGORY_LENGTH) {
            throw new IllegalArgumentException("Category must be at most " + MAX_CATEGORY_LENGTH + " characters");
        }
        return normalized;
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount is required");
        }
        if (amount.scale() > MAX_AMOUNT_SCALE) {
            throw new IllegalArgumentException("Amount can have at most " + MAX_AMOUNT_SCALE + " decimal places");
        }
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("Amount cannot be negative");
        }
        return amount;
    }

    private InvestmentDto mapRow(ResultSet resultSet) throws java.sql.SQLException {

        long id = resultSet.getLong("id");
        String category = resultSet.getString("category");
        BigDecimal amount = new BigDecimal(resultSet.getString("amount"));

        return new InvestmentDto(id, category, amount);
    }
}

