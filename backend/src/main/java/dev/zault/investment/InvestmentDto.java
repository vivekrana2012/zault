package dev.zault.investment;

import java.math.BigDecimal;

public record InvestmentDto(
        Long id,
        String category,
        BigDecimal amount) {
}

