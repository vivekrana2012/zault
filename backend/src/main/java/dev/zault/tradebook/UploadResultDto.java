package dev.zault.tradebook;

import java.math.BigDecimal;
import java.util.List;

public record UploadResultDto(
        List<FileUploadSummary> files,
        List<AllocationDto> allocations,
        BigDecimal totalInvested) {
}
