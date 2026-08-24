package com.autocare.controller;

import com.autocare.dto.VehicleRequest;
import com.autocare.dto.VehicleResponse;
import com.autocare.security.UserPrincipal;
import com.autocare.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    public ResponseEntity<VehicleResponse> registerVehicle(
        @Valid @RequestBody VehicleRequest request,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        VehicleResponse response = vehicleService.registerVehicle(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<VehicleResponse>> getVehicles(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<VehicleResponse> response = vehicleService.getVehicles(principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VehicleResponse> getVehicleById(
        @PathVariable("id") Integer id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        VehicleResponse response = vehicleService.getVehicleById(id, principal);
        return ResponseEntity.ok(response);
    }
}
