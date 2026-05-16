package dev.zault.tradebook;

import java.math.BigDecimal;

public record AllocationDto(
        String isin,
        String symbol,
        BigDecimal netQuantity,
        BigDecimal investedAmount) {
}
