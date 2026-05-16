package dev.zault.tradebook;

import java.math.BigDecimal;
import java.util.List;

public record AllocationsDto(
        List<AllocationDto> allocations,
        BigDecimal totalInvested) {
}
