package dev.zault.tradebook;

import dev.zault.db.UserDatabaseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import dev.zault.security.AuthenticatedUserPrincipal;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class TradebookServiceTest {

    private static final String VALID_HEADER =
            "symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time";

    private static final String USER_ID = "00000000-0000-0000-0000-000000000001";

    @TempDir
    Path tempDir;

    private TradebookService tradebookService;

    @BeforeEach
    void setUp() {
        UserDatabaseService userDatabaseService = new UserDatabaseService(
                tempDir.toString(), 4, 5000);
        tradebookService = new TradebookService(userDatabaseService);
        setAuthContext();
    }

    @Test
    void uploadSingleFile() {
        MockMultipartFile file = csvFile("trades.csv",
                VALID_HEADER + "\n"
                        + "ICICI,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92,1084.75,T1,O1,2024-04-04T09:07:37\n"
                        + "HDFC,INE040A01034,2024-04-05,NSE,EQ,EQ,buy,false,50,1500.00,T2,O2,2024-04-05T10:00:00\n");

        UploadResultDto result = tradebookService.uploadFiles(List.of(file));

        assertEquals(1, result.files().size());
        assertEquals(2, result.files().getFirst().rowCount());
        assertEquals(0, result.files().getFirst().duplicatesSkipped());
        assertEquals(2, result.allocations().size());
    }

    @Test
    void uploadDeduplicatesByTradeId() {
        MockMultipartFile file1 = csvFile("first.csv",
                VALID_HEADER + "\n"
                        + "ICICI,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92,1084.75,T1,O1,2024-04-04T09:07:37\n"
                        + "HDFC,INE040A01034,2024-04-05,NSE,EQ,EQ,buy,false,50,1500.00,T2,O2,2024-04-05T10:00:00\n");

        MockMultipartFile file2 = csvFile("second.csv",
                VALID_HEADER + "\n"
                        + "ICICI,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92,1084.75,T1,O1,2024-04-04T09:07:37\n"
                        + "RELIANCE,INE002A01018,2024-04-06,NSE,EQ,EQ,buy,false,20,2500.00,T3,O3,2024-04-06T11:00:00\n");

        tradebookService.uploadFiles(List.of(file1));
        UploadResultDto result2 = tradebookService.uploadFiles(List.of(file2));

        // T1 is a duplicate, only T3 should be new
        assertEquals(1, result2.files().getFirst().rowCount());
        assertEquals(1, result2.files().getFirst().duplicatesSkipped());

        // Total trades should be 3 (T1, T2, T3)
        TradesPageDto trades = tradebookService.getTrades(0, 100, null);
        assertEquals(3, trades.totalCount());
    }

    @Test
    void deleteFileRemovesOnlyItsTrades() {
        MockMultipartFile file1 = csvFile("first.csv",
                VALID_HEADER + "\n"
                        + "ICICI,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92,1084.75,T1,O1,2024-04-04T09:07:37\n");

        MockMultipartFile file2 = csvFile("second.csv",
                VALID_HEADER + "\n"
                        + "HDFC,INE040A01034,2024-04-05,NSE,EQ,EQ,buy,false,50,1500.00,T2,O2,2024-04-05T10:00:00\n");

        UploadResultDto r1 = tradebookService.uploadFiles(List.of(file1));
        tradebookService.uploadFiles(List.of(file2));

        String file1Id = r1.files().getFirst().id();
        DeleteResultDto deleteResult = tradebookService.deleteFile(file1Id);

        assertEquals(1, deleteResult.deletedTradeCount());

        // Only T2 should remain
        TradesPageDto trades = tradebookService.getTrades(0, 100, null);
        assertEquals(1, trades.totalCount());
        assertEquals("T2", trades.trades().getFirst().tradeId());
    }

    @Test
    void deleteFileWithOverlapKeepsOtherFilesTrades() {
        // File A owns T1, File B tries to add T1 (duplicate) + T2
        MockMultipartFile fileA = csvFile("a.csv",
                VALID_HEADER + "\n"
                        + "ICICI,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92,1084.75,T1,O1,2024-04-04T09:07:37\n");

        MockMultipartFile fileB = csvFile("b.csv",
                VALID_HEADER + "\n"
                        + "ICICI,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,92,1084.75,T1,O1,2024-04-04T09:07:37\n"
                        + "HDFC,INE040A01034,2024-04-05,NSE,EQ,EQ,buy,false,50,1500.00,T2,O2,2024-04-05T10:00:00\n");

        tradebookService.uploadFiles(List.of(fileA));
        UploadResultDto r2 = tradebookService.uploadFiles(List.of(fileB));

        // Delete file B — T1 was owned by A so only T2 should be deleted
        String fileBId = r2.files().getFirst().id();
        DeleteResultDto deleteResult = tradebookService.deleteFile(fileBId);

        assertEquals(1, deleteResult.deletedTradeCount()); // Only T2 was owned by B
        TradesPageDto trades = tradebookService.getTrades(0, 100, null);
        assertEquals(1, trades.totalCount()); // T1 remains via A
    }

    @Test
    void allocationsExcludeNegativePositions() {
        // Buy 100, then sell 150 of same ISIN → net negative → excluded
        MockMultipartFile file = csvFile("trades.csv",
                VALID_HEADER + "\n"
                        + "ICICI,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,100,1000,T1,O1,2024-04-04T09:07:37\n"
                        + "ICICI,INE090A01021,2024-04-05,NSE,EQ,EQ,sell,false,150,1100,T2,O2,2024-04-05T10:00:00\n"
                        + "HDFC,INE040A01034,2024-04-06,NSE,EQ,EQ,buy,false,50,1500,T3,O3,2024-04-06T11:00:00\n");

        UploadResultDto result = tradebookService.uploadFiles(List.of(file));

        // Only HDFC should show (ICICI net qty is -50)
        assertEquals(1, result.allocations().size());
        assertEquals("INE040A01034", result.allocations().getFirst().isin());
    }

    @Test
    void allocationsReflectNetInvestment() {
        MockMultipartFile file = csvFile("trades.csv",
                VALID_HEADER + "\n"
                        + "ICICI,INE090A01021,2024-04-04,NSE,EQ,EQ,buy,false,100,1000,T1,O1,2024-04-04T09:07:37\n"
                        + "ICICI,INE090A01021,2024-04-05,NSE,EQ,EQ,sell,false,30,1100,T2,O2,2024-04-05T10:00:00\n");

        UploadResultDto result = tradebookService.uploadFiles(List.of(file));

        assertEquals(1, result.allocations().size());
        AllocationDto alloc = result.allocations().getFirst();
        assertEquals("INE090A01021", alloc.isin());
        // net qty = 100 - 30 = 70
        assertEquals(0, alloc.netQuantity().compareTo(new java.math.BigDecimal("70")));
        // invested = 100*1000 - 30*1100 = 100000 - 33000 = 67000
        assertEquals(0, alloc.investedAmount().compareTo(new java.math.BigDecimal("67000")));
    }

    @Test
    void listFilesReturnsAllUploaded() {
        MockMultipartFile file1 = csvFile("a.csv",
                VALID_HEADER + "\n"
                        + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,false,10,100,T1,O1,2024-01-01T10:00:00\n");
        MockMultipartFile file2 = csvFile("b.csv",
                VALID_HEADER + "\n"
                        + "SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,false,10,100,T2,O2,2024-01-01T10:00:00\n");

        tradebookService.uploadFiles(List.of(file1));
        tradebookService.uploadFiles(List.of(file2));

        List<TradeFileDto> files = tradebookService.listFiles();
        assertEquals(2, files.size());
    }

    @Test
    void paginationWorks() {
        StringBuilder csv = new StringBuilder(VALID_HEADER + "\n");
        for (int i = 1; i <= 25; i++) {
            csv.append(String.format("SYM,ISIN1,2024-01-01,NSE,EQ,EQ,buy,false,10,100,T%d,O%d,2024-01-01T10:%02d:00%n",
                    i, i, i));
        }
        MockMultipartFile file = csvFile("bulk.csv", csv.toString());
        tradebookService.uploadFiles(List.of(file));

        TradesPageDto page0 = tradebookService.getTrades(0, 10, null);
        assertEquals(25, page0.totalCount());
        assertEquals(10, page0.trades().size());
        assertEquals(0, page0.page());

        TradesPageDto page2 = tradebookService.getTrades(2, 10, null);
        assertEquals(5, page2.trades().size());
    }

    @Test
    void deleteNonexistentFileThrows() {
        assertThrows(IllegalArgumentException.class, () ->
                tradebookService.deleteFile("non-existent-id"));
    }

    private void setAuthContext() {
        var principal = new AuthenticatedUserPrincipal("testuser", USER_ID, Set.of("db:read", "db:write"));
        var auth = new TestingAuthenticationToken(principal, null, "ROLE_USER");
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private MockMultipartFile csvFile(String filename, String content) {
        return new MockMultipartFile("files", filename, "text/csv",
                content.getBytes(StandardCharsets.UTF_8));
    }
}
