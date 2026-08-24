package com.autocare.controller;

import com.autocare.dto.AppointmentRequest;
import com.autocare.dto.AppointmentResponse;
import com.autocare.dto.AppointmentStatusUpdateRequest;
import com.autocare.security.UserPrincipal;
import com.autocare.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    public ResponseEntity<AppointmentResponse> createAppointment(
        @Valid @RequestBody AppointmentRequest request,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        AppointmentResponse response = appointmentService.createAppointment(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAppointments(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<AppointmentResponse> response = appointmentService.getAppointments(principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointmentById(
        @PathVariable("id") Integer id,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        AppointmentResponse response = appointmentService.getAppointmentById(id, principal);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AppointmentResponse> updateAppointmentStatus(
        @PathVariable("id") Integer id,
        @Valid @RequestBody AppointmentStatusUpdateRequest request,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        AppointmentResponse response = appointmentService.updateAppointmentStatus(id, request, principal);
        return ResponseEntity.ok(response);
    }
}
