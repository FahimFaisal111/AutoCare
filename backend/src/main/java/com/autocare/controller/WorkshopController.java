package com.autocare.controller;

import com.autocare.dto.UserProfileResponse;
import com.autocare.dto.WorkshopStatsResponse;
import com.autocare.security.UserPrincipal;
import com.autocare.service.WorkshopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workshops")
@RequiredArgsConstructor
public class WorkshopController {

    private final WorkshopService workshopService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkshopStatsResponse> getStats(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        WorkshopStatsResponse response = workshopService.getWorkshopStats(principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/mechanics")
    public ResponseEntity<List<UserProfileResponse>> getMechanics(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<UserProfileResponse> response = workshopService.getWorkshopMechanics(principal);
        return ResponseEntity.ok(response);
    }
}
