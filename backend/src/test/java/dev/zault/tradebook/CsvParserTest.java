package dev.zault.tradebook;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class CsvParserTest {

    private static final String VALID_HEADER =
            "symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time";

    @Test
    void parsesValidCsv() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "ICICIBANK,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92.000000,1084.750000,20015219,1100000000191603,2024-04-04T09:07:37\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertFalse(result.hasErrors());
        assertEquals(1, result.trades().size());

        CsvParser.ParsedTrade trade = result.trades().getFirst();
        assertEquals("ICICIBANK", trade.symbol());
        assertEquals("INE090A01021", trade.isin());
        assertEquals("2024-04-04", trade.tradeDate());
        assertEquals("NSE", trade.exchange());
        assertEquals("EQ", trade.segment());
        assertEquals("EQ", trade.series());
        assertEquals("buy", trade.tradeType());
        assertFalse(trade.auction());
        assertEquals(new BigDecimal("92.000000"), trade.quantity());
        assertEquals(new BigDecimal("1084.750000"), trade.price());
        assertEquals("20015219", trade.tradeId());
        assertEquals("1100000000191603", trade.orderId());
        assertEquals("2024-04-04T09:07:37", trade.orderExecutionTime());
    }

    @Test
    void parsesMultipleRows() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "ICICIBANK,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92,1084.75,T1,O1,2024-04-04T09:07:37\n"
                + "HDFCBANK,INE040A01034,2024-04-05,NSE,EQ,EQ,sell,false,50,1500.00,T2,O2,2024-04-05T10:00:00\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertFalse(result.hasErrors());
        assertEquals(2, result.trades().size());
        assertEquals("sell", result.trades().get(1).tradeType());
    }

    @Test
    void rejectsEmptyFile() throws IOException {
        CsvParser.ParseResult result = CsvParser.parse(toStream(""));

        assertTrue(result.hasFatalError());
        assertTrue(result.errors().getFirst().contains("empty"));
    }

    @Test
    void rejectsInvalidHeader() throws IOException {
        String csv = "wrong,header,columns\ndata,here,now\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertTrue(result.hasFatalError());
        assertTrue(result.errors().getFirst().contains("Invalid header"));
    }

    @Test
    void skipsMalformedRowsAndCollectsErrors() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "ICICIBANK,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92,1084.75,T1,O1,2024-04-04T09:07:37\n"
                + "BAD_ROW_MISSING_COLUMNS\n"
                + "HDFCBANK,INE040A01034,2024-04-05,NSE,EQ,EQ,sell,false,50,1500.00,T2,O2,2024-04-05T10:00:00\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertTrue(result.hasErrors());
        assertFalse(result.hasFatalError());
        assertEquals(2, result.trades().size());
        assertEquals(1, result.errors().size());
        assertTrue(result.errors().getFirst().contains("Row 3"));
    }

    @Test
    void normalizesTradeTypeToCaseInsensitive() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,BUY,false,10,100,T1,O1,2024-01-01T10:00:00\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,Sell,0,5,110,T2,O2,2024-01-01T11:00:00\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertFalse(result.hasErrors());
        assertEquals("buy", result.trades().get(0).tradeType());
        assertEquals("sell", result.trades().get(1).tradeType());
    }

    @Test
    void normalizesAuctionBoolean() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,true,10,100,T1,O1,2024-01-01T10:00:00\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,1,10,100,T2,O2,2024-01-01T10:00:00\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,yes,10,100,T3,O3,2024-01-01T10:00:00\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,no,10,100,T4,O4,2024-01-01T10:00:00\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertFalse(result.hasErrors());
        assertTrue(result.trades().get(0).auction());
        assertTrue(result.trades().get(1).auction());
        assertTrue(result.trades().get(2).auction());
        assertFalse(result.trades().get(3).auction());
    }

    @Test
    void rejectsInvalidTradeType() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,hold,false,10,100,T1,O1,2024-01-01T10:00:00\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertTrue(result.hasErrors());
        assertEquals(0, result.trades().size());
        assertTrue(result.errors().getFirst().contains("trade_type"));
    }

    @Test
    void rejectsNegativeQuantity() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,false,-10,100,T1,O1,2024-01-01T10:00:00\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertTrue(result.hasErrors());
        assertEquals(0, result.trades().size());
        assertTrue(result.errors().getFirst().contains("quantity"));
    }

    @Test
    void rejectsNonNumericPrice() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,false,10,abc,T1,O1,2024-01-01T10:00:00\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertTrue(result.hasErrors());
        assertEquals(0, result.trades().size());
        assertTrue(result.errors().getFirst().contains("price"));
    }

    @Test
    void skipsBlankLines() throws IOException {
        String csv = VALID_HEADER + "\n"
                + "\n"
                + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,false,10,100,T1,O1,2024-01-01T10:00:00\n"
                + "\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertFalse(result.hasErrors());
        assertEquals(1, result.trades().size());
    }

    @Test
    void allowsBlankSeries() throws IOException {
        // Mutual fund trades on BSE have empty series field
        String csv = VALID_HEADER + "\n"
                + "NAVI NIFTY 50,INF959L01FP2,2024-04-15,BSE,MF,,buy,false,1396.929,14.3164,T1,O1,2024-04-15T00:00:00\n";

        CsvParser.ParseResult result = CsvParser.parse(toStream(csv));

        assertFalse(result.hasErrors());
        assertEquals(1, result.trades().size());
        assertEquals("", result.trades().getFirst().series());
    }

    private ByteArrayInputStream toStream(String content) {
        return new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
    }
}
