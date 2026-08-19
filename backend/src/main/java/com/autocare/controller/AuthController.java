package com.autocare.controller;

import com.autocare.dto.*;
import com.autocare.security.UserPrincipal;
import com.autocare.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Public Endpoint: Customer self-registration using a workshop access code.
     */
    @PostMapping("/register/customer")
    public ResponseEntity<AuthResponse> registerCustomer(@Valid @RequestBody CustomerRegisterRequest request) {
        AuthResponse response = authService.registerCustomer(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Public Endpoint: Mechanic staff onboarding using a workshop access code and employee code.
     */
    @PostMapping("/register/mechanic")
    public ResponseEntity<AuthResponse> registerMechanic(@Valid @RequestBody MechanicRegisterRequest request) {
        AuthResponse response = authService.registerMechanic(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Public Endpoint: User login for all roles returning stateless JWT.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Authenticated Endpoint: Fetch current user profile with tenant and role context.
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        UserProfileResponse response = authService.getCurrentUserProfile(principal);
        return ResponseEntity.ok(response);
    }
}
