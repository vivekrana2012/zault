package dev.zault.tradebook;

import java.math.BigDecimal;
import java.util.List;

public record TradeTimelineDto(List<TradePoint> trades) {

    public record TradePoint(String time, String tradeType, BigDecimal amount) {
    }
}

