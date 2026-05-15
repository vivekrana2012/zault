package dev.zault.controller;

import dev.zault.investment.CreateInvestmentRequest;
import dev.zault.investment.InvestmentDto;
import dev.zault.investment.InvestmentService;
import dev.zault.investment.UpdateInvestmentAmountRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        try {
            InvestmentDto created = investmentService.createInvestment(request);
            return ResponseEntity.status(201).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateInvestmentAmount(@PathVariable Long id,
                                                    @RequestBody UpdateInvestmentAmountRequest request) {
        try {
            return investmentService.updateAmount(id, request)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(404)
                            .body(Map.of("error", "Investment not found")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteInvestment(@PathVariable Long id) {
        try {
            boolean deleted = investmentService.deleteInvestment(id);
            if (!deleted) {
                return ResponseEntity.status(404).body(Map.of("error", "Investment not found"));
            }
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

