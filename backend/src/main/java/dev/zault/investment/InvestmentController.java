package dev.zault.investment;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/investments")
public class InvestmentController {

    private final InvestmentService investmentService;

    public InvestmentController(InvestmentService investmentService) {
        this.investmentService = investmentService;
    }

    @GetMapping
    public ResponseEntity<List<InvestmentDto>> listInvestments() {
        return ResponseEntity.ok(investmentService.listInvestments());
    }

    @PostMapping
    public ResponseEntity<?> createInvestment(@RequestBody CreateInvestmentRequest request) {

        InvestmentDto created = investmentService.createInvestment(request);
        return ResponseEntity.status(201).body(created);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateInvestmentAmount(@PathVariable Long id,
                                                    @RequestBody UpdateInvestmentAmountRequest request) {
        return investmentService.updateAmount(id, request)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "Investment not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteInvestment(@PathVariable Long id) {

        boolean deleted = investmentService.deleteInvestment(id);

        if (!deleted) {
            return ResponseEntity.status(404).body(Map.of("error", "Investment not found"));
        }

        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
