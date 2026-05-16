package dev.zault.tradebook;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
        try {
            DeleteResultDto result = tradebookService.deleteFile(fileId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
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
}
