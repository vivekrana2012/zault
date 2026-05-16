package dev.zault.tradebook;

import java.util.List;

public record TradesPageDto(
        List<TradeDto> trades,
        long totalCount,
        int page,
        int size) {
}
