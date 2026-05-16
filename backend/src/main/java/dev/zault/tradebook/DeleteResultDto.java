package dev.zault.tradebook;

import java.math.BigDecimal;
import java.util.List;

public record DeleteResultDto(
        int deletedTradeCount,
        List<AllocationDto> allocations,
        BigDecimal totalInvested) {
}
