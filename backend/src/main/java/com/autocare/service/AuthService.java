package com.autocare.service;

import com.autocare.dto.*;
import com.autocare.entity.*;
import com.autocare.exception.ConflictException;
import com.autocare.exception.ResourceNotFoundException;
import com.autocare.repository.CustomerRepository;
import com.autocare.repository.MechanicRepository;
import com.autocare.repository.UserRepository;
import com.autocare.repository.WorkshopRepository;
import com.autocare.security.JwtUtil;
import com.autocare.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final MechanicRepository mechanicRepository;
    private final WorkshopRepository workshopRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    /**
     * Registers a new customer and associates them with a workshop via access code.
     */
    @Transactional
    public AuthResponse registerCustomer(CustomerRegisterRequest request) {
        // 1. Resolve tenant workshop boundary
        Workshop workshop = workshopRepository.findByAccessCode(request.getWorkshopAccessCode())
            .orElseThrow(() -> new ResourceNotFoundException("Invalid workshop access code: " + request.getWorkshopAccessCode()));

        // 2. Enforce global email uniqueness
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("An account with email " + request.getEmail() + " already exists.");
        }

        // 3. Create polymorphic Customer entity (Subtype of User)
        Customer customer = Customer.builder()
            .workshop(workshop)
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .email(request.getEmail())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .role(Role.CUSTOMER)
            .phone(request.getPhone())
            .build();

        // 4. Persist to DB (Hibernate writes to both 'user' and 'customer' tables via JOINED inheritance)
        Customer savedCustomer = customerRepository.save(customer);

        // 5. Generate JWT token
        UserPrincipal principal = UserPrincipal.create(savedCustomer);
        String token = jwtUtil.generateToken(principal);

        return AuthResponse.builder()
            .token(token)
            .userId(savedCustomer.getUserId())
            .workshopId(workshop.getWorkshopId())
            .workshopName(workshop.getName())
            .email(savedCustomer.getEmail())
            .firstName(savedCustomer.getFirstName())
            .lastName(savedCustomer.getLastName())
            .role(Role.CUSTOMER)
            .build();
    }

    /**
     * Admin-only: Registers a new mechanic staff member with a unique employee code.
     */
    @Transactional
    public AuthResponse registerMechanic(MechanicRegisterRequest request) {
        Workshop workshop = workshopRepository.findByAccessCode(request.getWorkshopAccessCode())
            .orElseThrow(() -> new ResourceNotFoundException("Invalid workshop access code: " + request.getWorkshopAccessCode()));

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered: " + request.getEmail());
        }

        if (mechanicRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw new ConflictException("Employee badge code already in use: " + request.getEmployeeCode());
        }

        Mechanic mechanic = Mechanic.builder()
            .workshop(workshop)
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .email(request.getEmail())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .role(Role.MECHANIC)
            .employeeCode(request.getEmployeeCode())
            .build();

        Mechanic savedMechanic = mechanicRepository.save(mechanic);
        UserPrincipal principal = UserPrincipal.create(savedMechanic);
        String token = jwtUtil.generateToken(principal);

        return AuthResponse.builder()
            .token(token)
            .userId(savedMechanic.getUserId())
            .workshopId(workshop.getWorkshopId())
            .workshopName(workshop.getName())
            .email(savedMechanic.getEmail())
            .firstName(savedMechanic.getFirstName())
            .lastName(savedMechanic.getLastName())
            .role(Role.MECHANIC)
            .build();
    }

    /**
     * Authenticates credentials and returns a JWT token with tenant claims.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtUtil.generateToken(principal);

        User user = userRepository.findById(principal.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return AuthResponse.builder()
            .token(token)
            .userId(user.getUserId())
            .workshopId(user.getWorkshop().getWorkshopId())
            .workshopName(user.getWorkshop().getName())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .build();
    }

    /**
     * Retrieves the profile of the currently authenticated user.
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(UserPrincipal principal) {
        User user = userRepository.findById(principal.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserProfileResponse.UserProfileResponseBuilder builder = UserProfileResponse.builder()
            .userId(user.getUserId())
            .workshopId(user.getWorkshop().getWorkshopId())
            .workshopName(user.getWorkshop().getName())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole());

        if (user instanceof Customer customer) {
            builder.phone(customer.getPhone());
        } else if (user instanceof Mechanic mechanic) {
            builder.employeeCode(mechanic.getEmployeeCode());
        }

        return builder.build();
    }

    /**
     * Registers a new Workshop organization and provisions its initial ADMIN owner account.
     */
    @Transactional
    public AuthResponse registerWorkshop(WorkshopRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("An account with email " + request.getEmail() + " already exists.");
        }

        String accessCode = request.getAccessCode();
        if (accessCode == null || accessCode.trim().isEmpty()) {
            accessCode = "WS-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } else {
            accessCode = accessCode.trim();
            if (workshopRepository.findByAccessCode(accessCode).isPresent()) {
                throw new ConflictException("Workshop access code '" + accessCode + "' is already in use. Please select a unique code.");
            }
        }

        // 1. Create and persist Workshop tenant
        Workshop workshop = Workshop.builder()
            .name(request.getWorkshopName())
            .address(request.getWorkshopAddress())
            .accessCode(accessCode)
            .build();

        Workshop savedWorkshop = workshopRepository.save(workshop);

        // 2. Create and persist Admin user for the workshop
        User admin = User.builder()
            .workshop(savedWorkshop)
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .email(request.getEmail())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .role(Role.ADMIN)
            .build();

        User savedAdmin = userRepository.save(admin);

        // 3. Issue JWT token
        UserPrincipal principal = UserPrincipal.create(savedAdmin);
        String token = jwtUtil.generateToken(principal);

        return AuthResponse.builder()
            .token(token)
            .userId(savedAdmin.getUserId())
            .workshopId(savedWorkshop.getWorkshopId())
            .workshopName(savedWorkshop.getName())
            .email(savedAdmin.getEmail())
            .firstName(savedAdmin.getFirstName())
            .lastName(savedAdmin.getLastName())
            .role(Role.ADMIN)
            .build();
    }

    /**
     * Public helper: Retrieves a list of active workshops to allow user-friendly onboarding.
     */
    @Transactional(readOnly = true)
    public java.util.List<WorkshopSummaryResponse> getPublicWorkshops() {
        return workshopRepository.findAll().stream()
            .map(w -> WorkshopSummaryResponse.builder()
                .workshopId(w.getWorkshopId())
                .name(w.getName())
                .address(w.getAddress())
                .accessCode(w.getAccessCode())
                .build())
            .toList();
    }

    /**
     * Generates a 15-minute cryptographically signed reset token for a user account.
     */
    @Transactional(readOnly = true)
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim())
            .orElseThrow(() -> new ResourceNotFoundException("No active account found with email: " + request.getEmail()));

        String resetToken = jwtUtil.generatePasswordResetToken(user.getEmail());

        return ForgotPasswordResponse.builder()
            .message("Password reset token generated successfully. Valid for 15 minutes.")
            .resetToken(resetToken)
            .build();
    }

    /**
     * Validates reset token and securely updates the user's password with BCrypt.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String token = request.getResetToken().trim();
        if (!jwtUtil.validatePasswordResetToken(token)) {
            throw new com.autocare.exception.BadRequestException("Invalid or expired password reset token. Please request a new one.");
        }

        String email = jwtUtil.getEmailFromResetToken(token);
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User associated with this reset token not found."));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}


