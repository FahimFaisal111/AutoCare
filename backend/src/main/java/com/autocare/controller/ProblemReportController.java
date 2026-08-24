package com.autocare.controller;

import com.autocare.dto.ProblemReportRequest;
import com.autocare.dto.ProblemReportResponse;
import com.autocare.security.UserPrincipal;
import com.autocare.service.ProblemReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/problem-reports")
@RequiredArgsConstructor
public class ProblemReportController {

    private final ProblemReportService problemReportService;

    @PostMapping
    public ResponseEntity<ProblemReportResponse> createProblemReport(
        @Valid @RequestBody ProblemReportRequest request,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        ProblemReportResponse response = problemReportService.createProblemReport(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ProblemReportResponse>> getProblemReports(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<ProblemReportResponse> response = problemReportService.getProblemReports(principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProblemReportResponse> getProblemReportById(
        @PathVariable("id") Integer id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        ProblemReportResponse response = problemReportService.getProblemReportById(id, principal);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/review")
    public ResponseEntity<ProblemReportResponse> reviewReport(
        @PathVariable("id") Integer id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        ProblemReportResponse response = problemReportService.reviewReportByMechanic(id, principal);
        return ResponseEntity.ok(response);
    }
}
