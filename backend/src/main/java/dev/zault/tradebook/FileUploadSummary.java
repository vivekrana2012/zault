package dev.zault.tradebook;

import java.util.List;

public record FileUploadSummary(
        String id,
        String filename,
        int rowCount,
        int duplicatesSkipped,
        int errorRows,
        List<String> errors) {
}
