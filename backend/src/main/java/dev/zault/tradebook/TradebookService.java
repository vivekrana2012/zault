package dev.zault.tradebook;

import dev.zault.db.UserDatabaseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class TradebookService {

    private static final Logger log = LoggerFactory.getLogger(TradebookService.class);
    private static final int BATCH_SIZE = 500;

    private final UserDatabaseService userDatabaseService;

    public TradebookService(UserDatabaseService userDatabaseService) {
        this.userDatabaseService = userDatabaseService;
    }

    public UploadResultDto uploadFiles(List<MultipartFile> files) {
        List<FileUploadSummary> summaries = new ArrayList<>();

        for (MultipartFile file : files) {
            FileUploadSummary summary = processSingleFile(file);
            summaries.add(summary);
        }

        AllocationsDto allocations = getAllocations();
        return new UploadResultDto(summaries, allocations.allocations(), allocations.totalInvested());
    }

    public List<TradeFileDto> listFiles() {
        return userDatabaseService.withCurrentUserDatabase("db:read", connection -> {
            List<TradeFileDto> result = new ArrayList<>();
            try (PreparedStatement ps = connection.prepareStatement(
                    "SELECT id, filename, row_count, uploaded_at FROM tradebook_files ORDER BY uploaded_at DESC")) {
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        result.add(new TradeFileDto(
                                rs.getString("id"),
                                rs.getString("filename"),
                                rs.getInt("row_count"),
                                rs.getString("uploaded_at")));
                    }
                }
            }
            return result;
        });
    }

    public DeleteResultDto deleteFile(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            throw new IllegalArgumentException("File ID is required");
        }

        return userDatabaseService.withCurrentUserDatabase("db:write", connection -> {
            // Verify file exists
            boolean exists;
            try (PreparedStatement ps = connection.prepareStatement(
                    "SELECT 1 FROM tradebook_files WHERE id = ?")) {
                ps.setString(1, fileId);
                try (ResultSet rs = ps.executeQuery()) {
                    exists = rs.next();
                }
            }
            if (!exists) {
                throw new IllegalArgumentException("File not found: " + fileId);
            }

            boolean originalAutoCommit = connection.getAutoCommit();
            try {
                connection.setAutoCommit(false);

                // Delete trades belonging to this file
                int deletedCount;
                try (PreparedStatement ps = connection.prepareStatement(
                        "DELETE FROM trades WHERE file_id = ?")) {
                    ps.setString(1, fileId);
                    deletedCount = ps.executeUpdate();
                }

                // Delete file record
                try (PreparedStatement ps = connection.prepareStatement(
                        "DELETE FROM tradebook_files WHERE id = ?")) {
                    ps.setString(1, fileId);
                    ps.executeUpdate();
                }

                // Recompute allocations
                recomputeAllocations(connection);

                connection.commit();

                AllocationsDto allocations = readAllocations(connection);
                return new DeleteResultDto(deletedCount, allocations.allocations(), allocations.totalInvested());
            } catch (SQLException e) {
                connection.rollback();
                throw e;
            } finally {
                connection.setAutoCommit(originalAutoCommit);
            }
        });
    }

    public AllocationsDto getAllocations() {
        return userDatabaseService.withCurrentUserDatabase("db:read", this::readAllocations);
    }

    public TradesPageDto getTrades(int page, int size, String fileId) {
        if (page < 0) page = 0;
        if (size <= 0 || size > 100) size = 20;

        final int effectivePage = page;
        final int effectiveSize = size;

        return userDatabaseService.withCurrentUserDatabase("db:read", connection -> {
            long totalCount;
            List<TradeDto> trades = new ArrayList<>();

            // Count total
            String countSql = fileId != null
                    ? "SELECT COUNT(*) FROM trades WHERE file_id = ?"
                    : "SELECT COUNT(*) FROM trades";
            try (PreparedStatement ps = connection.prepareStatement(countSql)) {
                if (fileId != null) {
                    ps.setString(1, fileId);
                }
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next();
                    totalCount = rs.getLong(1);
                }
            }

            // Fetch page
            String selectSql = fileId != null
                    ? "SELECT * FROM trades WHERE file_id = ? ORDER BY order_execution_time DESC LIMIT ? OFFSET ?"
                    : "SELECT * FROM trades ORDER BY order_execution_time DESC LIMIT ? OFFSET ?";
            try (PreparedStatement ps = connection.prepareStatement(selectSql)) {
                int paramIdx = 1;
                if (fileId != null) {
                    ps.setString(paramIdx++, fileId);
                }
                ps.setInt(paramIdx++, effectiveSize);
                ps.setInt(paramIdx, effectivePage * effectiveSize);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        trades.add(mapTradeRow(rs));
                    }
                }
            }

            return new TradesPageDto(trades, totalCount, effectivePage, effectiveSize);
        });
    }

    private FileUploadSummary processSingleFile(MultipartFile file) {
        String fileId = UUID.randomUUID().toString();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown.csv";

        CsvParser.ParseResult parseResult;
        try {
            parseResult = CsvParser.parse(file.getInputStream());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read file: " + filename, e);
        }

        List<String> firstErrors = parseResult.errors().stream().limit(3).toList();

        if (parseResult.hasFatalError()) {
            return new FileUploadSummary(fileId, filename, 0, 0, parseResult.errors().size(), firstErrors);
        }

        List<CsvParser.ParsedTrade> parsedTrades = parseResult.trades();
        if (parsedTrades.isEmpty()) {
            return new FileUploadSummary(fileId, filename, 0, 0, parseResult.errors().size(), firstErrors);
        }

        return userDatabaseService.withCurrentUserDatabase("db:write", connection -> {
            boolean originalAutoCommit = connection.getAutoCommit();
            try {
                connection.setAutoCommit(false);

                int inserted = batchInsertTrades(connection, fileId, parsedTrades);
                int duplicatesSkipped = parsedTrades.size() - inserted;

                // Insert file record
                try (PreparedStatement ps = connection.prepareStatement(
                        "INSERT INTO tradebook_files (id, filename, row_count) VALUES (?, ?, ?)")) {
                    ps.setString(1, fileId);
                    ps.setString(2, filename);
                    ps.setInt(3, inserted);
                    ps.executeUpdate();
                }

                // Recompute allocations
                recomputeAllocations(connection);

                connection.commit();

                return new FileUploadSummary(fileId, filename, inserted, duplicatesSkipped, parseResult.errors().size(), firstErrors);
            } catch (SQLException e) {
                connection.rollback();
                throw e;
            } finally {
                connection.setAutoCommit(originalAutoCommit);
            }
        });
    }



    private int batchInsertTrades(Connection connection, String fileId, List<CsvParser.ParsedTrade> trades)
            throws SQLException {
        String sql = """
                INSERT OR IGNORE INTO trades
                (trade_id, file_id, symbol, isin, trade_date, exchange, segment, series,
                 trade_type, auction, quantity, price, order_id, order_execution_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        int totalInserted = 0;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            int batchCount = 0;
            for (CsvParser.ParsedTrade trade : trades) {
                ps.setString(1, trade.tradeId());
                ps.setString(2, fileId);
                ps.setString(3, trade.symbol());
                ps.setString(4, trade.isin());
                ps.setString(5, trade.tradeDate());
                ps.setString(6, trade.exchange());
                ps.setString(7, trade.segment());
                ps.setString(8, trade.series());
                ps.setString(9, trade.tradeType());
                ps.setInt(10, trade.auction() ? 1 : 0);
                ps.setString(11, trade.quantity().toPlainString());
                ps.setString(12, trade.price().toPlainString());
                ps.setString(13, trade.orderId());
                ps.setString(14, trade.orderExecutionTime());
                ps.addBatch();
                batchCount++;

                if (batchCount >= BATCH_SIZE) {
                    totalInserted += countInserted(ps.executeBatch());
                    batchCount = 0;
                }
            }
            if (batchCount > 0) {
                totalInserted += countInserted(ps.executeBatch());
            }
        }
        return totalInserted;
    }

    private int countInserted(int[] batchResults) {
        int count = 0;
        for (int result : batchResults) {
            if (result > 0) {
                count++;
            }
        }
        return count;
    }

    private void recomputeAllocations(Connection connection) throws SQLException {
        // Clear existing allocations
        try (PreparedStatement ps = connection.prepareStatement("DELETE FROM allocations")) {
            ps.executeUpdate();
        }

        // Compute net positions grouped by ISIN
        String sql = """
                SELECT isin, symbol, trade_type,
                       SUM(CAST(quantity AS REAL)) as total_qty,
                       SUM(CAST(quantity AS REAL) * CAST(price AS REAL)) as total_amount
                FROM trades
                GROUP BY isin, trade_type
                """;

        record IsinAgg(String symbol, BigDecimal buyQty, BigDecimal buyAmount,
                       BigDecimal sellQty, BigDecimal sellAmount) {
        }

        java.util.Map<String, IsinAgg> aggs = new java.util.HashMap<>();

        try (PreparedStatement ps = connection.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String isin = rs.getString("isin");
                String symbol = rs.getString("symbol");
                String tradeType = rs.getString("trade_type");
                BigDecimal qty = BigDecimal.valueOf(rs.getDouble("total_qty"));
                BigDecimal amount = BigDecimal.valueOf(rs.getDouble("total_amount"));

                IsinAgg existing = aggs.getOrDefault(isin, new IsinAgg(symbol,
                        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));

                if ("buy".equals(tradeType)) {
                    aggs.put(isin, new IsinAgg(symbol,
                            existing.buyQty().add(qty), existing.buyAmount().add(amount),
                            existing.sellQty(), existing.sellAmount()));
                } else {
                    aggs.put(isin, new IsinAgg(existing.symbol(),
                            existing.buyQty(), existing.buyAmount(),
                            existing.sellQty().add(qty), existing.sellAmount().add(amount)));
                }
            }
        }

        // Insert only positive net positions
        String insertSql = """
                INSERT INTO allocations (isin, symbol, net_quantity, invested_amount, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """;
        try (PreparedStatement ps = connection.prepareStatement(insertSql)) {
            for (var entry : aggs.entrySet()) {
                String isin = entry.getKey();
                IsinAgg agg = entry.getValue();
                BigDecimal netQty = agg.buyQty().subtract(agg.sellQty());
                BigDecimal netAmount = agg.buyAmount().subtract(agg.sellAmount());

                if (netQty.signum() > 0) {
                    ps.setString(1, isin);
                    ps.setString(2, agg.symbol());
                    ps.setString(3, netQty.setScale(3, RoundingMode.HALF_UP).toPlainString());
                    ps.setString(4, netAmount.setScale(4, RoundingMode.HALF_UP).toPlainString());
                    ps.addBatch();
                }
            }
            ps.executeBatch();
        }
    }

    private AllocationsDto readAllocations(Connection connection) throws SQLException {
        List<AllocationDto> allocations = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        try (PreparedStatement ps = connection.prepareStatement(
                "SELECT isin, symbol, net_quantity, invested_amount FROM allocations ORDER BY CAST(invested_amount AS REAL) DESC")) {
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    BigDecimal investedAmount = new BigDecimal(rs.getString("invested_amount"));
                    allocations.add(new AllocationDto(
                            rs.getString("isin"),
                            rs.getString("symbol"),
                            new BigDecimal(rs.getString("net_quantity")),
                            investedAmount));
                    total = total.add(investedAmount);
                }
            }
        }

        return new AllocationsDto(allocations, total);
    }

    private TradeDto mapTradeRow(ResultSet rs) throws SQLException {
        return new TradeDto(
                rs.getString("trade_id"),
                rs.getString("file_id"),
                rs.getString("symbol"),
                rs.getString("isin"),
                rs.getString("trade_date"),
                rs.getString("exchange"),
                rs.getString("segment"),
                rs.getString("series"),
                rs.getString("trade_type"),
                rs.getInt("auction") == 1,
                new BigDecimal(rs.getString("quantity")).setScale(3, RoundingMode.HALF_UP),
                new BigDecimal(rs.getString("price")).setScale(4, RoundingMode.HALF_UP),
                rs.getString("order_id"),
                rs.getString("order_execution_time"));
    }
}
