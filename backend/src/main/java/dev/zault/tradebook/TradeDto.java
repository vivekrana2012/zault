package dev.zault.tradebook;

import java.math.BigDecimal;

public record TradeDto(
        String tradeId,
        String fileId,
        String symbol,
        String isin,
        String tradeDate,
        String exchange,
        String segment,
        String series,
        String tradeType,
        boolean auction,
        BigDecimal quantity,
        BigDecimal price,
        String orderId,
        String orderExecutionTime) {
}
