package dev.zault.tradebook;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tradebook")
public class TradebookController {

    private final TradebookService tradebookService;

    public TradebookController(TradebookService tradebookService) {
        this.tradebookService = tradebookService;
    }

    @PostMapping("/files")
    public ResponseEntity<?> uploadFiles(@RequestParam("files") List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "At least one file is required"));
        }
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Empty file detected"));
            }
        }
        UploadResultDto result = tradebookService.uploadFiles(files);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/files")
    public ResponseEntity<List<TradeFileDto>> listFiles() {
        return ResponseEntity.ok(tradebookService.listFiles());
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable String fileId) {
        DeleteResultDto result = tradebookService.deleteFile(fileId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/allocations")
    public ResponseEntity<AllocationsDto> getAllocations() {
        return ResponseEntity.ok(tradebookService.getAllocations());
    }

    @GetMapping("/trades")
    public ResponseEntity<TradesPageDto> getTrades(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String fileId) {
        return ResponseEntity.ok(tradebookService.getTrades(page, size, fileId));
    }

    @GetMapping("/trades/timeline")
    public ResponseEntity<TradeTimelineDto> getTradeTimeline() {
        return ResponseEntity.ok(tradebookService.getTradeTimeline());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
