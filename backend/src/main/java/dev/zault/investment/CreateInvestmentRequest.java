package dev.zault.investment;

import java.math.BigDecimal;

public record CreateInvestmentRequest(
        String category,
        BigDecimal amount) {
}

