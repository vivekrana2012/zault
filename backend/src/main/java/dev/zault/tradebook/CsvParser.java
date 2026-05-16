package dev.zault.tradebook;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses tradebook CSV files into validated trade records.
 */
public final class CsvParser {

    private static final String[] EXPECTED_HEADER = {
            "symbol", "isin", "trade_date", "exchange", "segment", "series",
            "trade_type", "auction", "quantity", "price", "trade_id", "order_id",
            "order_execution_time"
    };

    private CsvParser() {
    }

    public static ParseResult parse(InputStream input) throws IOException {
        List<ParsedTrade> trades = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null || headerLine.isBlank()) {
                return new ParseResult(trades, List.of("File is empty or has no header"));
            }

            String[] headers = splitCsvLine(headerLine);
            if (!validateHeader(headers)) {
                return new ParseResult(trades, List.of(
                        "Invalid header. Expected: " + String.join(",", EXPECTED_HEADER)));
            }

            String line;
            int lineNumber = 1;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (line.isBlank()) {
                    continue;
                }
                try {
                    ParsedTrade trade = parseLine(line, lineNumber);
                    trades.add(trade);
                } catch (IllegalArgumentException e) {
                    errors.add("Row " + lineNumber + ": " + e.getMessage());
                }
            }
        }

        return new ParseResult(trades, errors);
    }

    private static boolean validateHeader(String[] headers) {
        if (headers.length != EXPECTED_HEADER.length) {
            return false;
        }
        for (int i = 0; i < EXPECTED_HEADER.length; i++) {
            if (!EXPECTED_HEADER[i].equals(headers[i].trim().toLowerCase())) {
                return false;
            }
        }
        return true;
    }

    private static ParsedTrade parseLine(String line, int lineNumber) {
        String[] fields = splitCsvLine(line);
        if (fields.length != EXPECTED_HEADER.length) {
            throw new IllegalArgumentException("Expected " + EXPECTED_HEADER.length
                    + " columns, got " + fields.length);
        }

        String symbol = requireNonBlank(fields[0].trim(), "symbol");
        String isin = requireNonBlank(fields[1].trim(), "isin");
        String tradeDate = requireNonBlank(fields[2].trim(), "trade_date");
        String exchange = requireNonBlank(fields[3].trim(), "exchange");
        String segment = requireNonBlank(fields[4].trim(), "segment");
        String series = fields[5].trim(); // Can be blank (e.g., MF segment on BSE)
        String tradeType = normalizeTradeType(fields[6].trim());
        boolean auction = normalizeAuction(fields[7].trim());
        BigDecimal quantity = parseDecimal(fields[8].trim(), "quantity");
        BigDecimal price = parseDecimal(fields[9].trim(), "price");
        String tradeId = requireNonBlank(fields[10].trim(), "trade_id");
        String orderId = requireNonBlank(fields[11].trim(), "order_id");
        String orderExecutionTime = requireNonBlank(fields[12].trim(), "order_execution_time");

        if (quantity.signum() <= 0) {
            throw new IllegalArgumentException("quantity must be positive");
        }
        if (price.signum() <= 0) {
            throw new IllegalArgumentException("price must be positive");
        }

        return new ParsedTrade(
                tradeId, symbol, isin, tradeDate, exchange, segment, series,
                tradeType, auction, quantity, price, orderId, orderExecutionTime);
    }

    private static String requireNonBlank(String value, String fieldName) {
        if (value.isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return value;
    }

    private static String normalizeTradeType(String value) {
        String lower = value.toLowerCase();
        if (!"buy".equals(lower) && !"sell".equals(lower)) {
            throw new IllegalArgumentException("trade_type must be 'buy' or 'sell', got: " + value);
        }
        return lower;
    }

    private static boolean normalizeAuction(String value) {
        String lower = value.toLowerCase();
        return switch (lower) {
            case "true", "1", "yes" -> true;
            case "false", "0", "no" -> false;
            default -> throw new IllegalArgumentException("auction must be a boolean, got: " + value);
        };
    }

    private static BigDecimal parseDecimal(String value, String fieldName) {
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(fieldName + " is not a valid number: " + value);
        }
    }

    private static String[] splitCsvLine(String line) {
        return line.split(",", -1);
    }

    public record ParsedTrade(
            String tradeId,
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

    public record ParseResult(
            List<ParsedTrade> trades,
            List<String> errors) {

        public boolean hasErrors() {
            return !errors.isEmpty();
        }

        public boolean hasFatalError() {
            return trades.isEmpty() && !errors.isEmpty();
        }
    }
}
