package dev.zault.tradebook;

public record TradeFileDto(
        String id,
        String filename,
        int rowCount,
        String uploadedAt) {
}
