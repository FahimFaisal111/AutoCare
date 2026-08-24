package com.autocare.service;

import com.autocare.dto.VehicleRequest;
import com.autocare.dto.VehicleResponse;
import com.autocare.entity.Reminder;
import com.autocare.entity.Role;
import com.autocare.entity.User;
import com.autocare.entity.Vehicle;
import com.autocare.exception.ConflictException;
import com.autocare.exception.ForbiddenException;
import com.autocare.exception.ResourceNotFoundException;
import com.autocare.repository.ReminderRepository;
import com.autocare.repository.UserRepository;
import com.autocare.repository.VehicleRepository;
import com.autocare.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final ReminderRepository reminderRepository;

    @Transactional
    public VehicleResponse registerVehicle(VehicleRequest request, UserPrincipal principal) {
        if (vehicleRepository.existsByVin(request.getVin())) {
            throw new ConflictException("A vehicle with VIN " + request.getVin() + " is already registered.");
        }

        User owner = userRepository.findById(principal.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Vehicle vehicle = Vehicle.builder()
            .owner(owner)
            .vin(request.getVin().trim().toUpperCase())
            .make(request.getMake().trim())
            .model(request.getModel().trim())
            .year(request.getYear())
            .odometer(request.getOdometer())
            .build();

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        // Provision initial predictive maintenance reminder for new vehicle
        Reminder initialReminder = Reminder.builder()
            .vehicle(savedVehicle)
            .reminderType("Routine Inspection & Diagnostics")
            .dueDate(LocalDate.now().plusMonths(3))
            .message("Quarterly multi-point vehicle inspection and fluid level check.")
            .status("ACTIVE")
            .build();
        reminderRepository.save(initialReminder);

        return mapToResponse(savedVehicle);
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> getVehicles(UserPrincipal principal) {
        if (principal.getRole() == Role.CUSTOMER) {
            return vehicleRepository.findAllByOwner_UserId(principal.getUserId()).stream()
                .map(this::mapToResponse)
                .toList();
        } else {
            return vehicleRepository.findAllByWorkshopId(principal.getWorkshopId()).stream()
                .map(this::mapToResponse)
                .toList();
        }
    }

    @Transactional(readOnly = true)
    public VehicleResponse getVehicleById(Integer vehicleId, UserPrincipal principal) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with ID: " + vehicleId));

        // Enforce tenant boundary
        if (!vehicle.getOwner().getWorkshop().getWorkshopId().equals(principal.getWorkshopId())) {
            throw new ForbiddenException("Unauthorized access to vehicle outside your workshop tenant.");
        }

        if (principal.getRole() == Role.CUSTOMER && !vehicle.getOwner().getUserId().equals(principal.getUserId())) {
            throw new ForbiddenException("Unauthorized access to vehicle owned by another user.");
        }

        return mapToResponse(vehicle);
    }

    private VehicleResponse mapToResponse(Vehicle v) {
        return VehicleResponse.builder()
            .vehicleId(v.getVehicleId())
            .ownerId(v.getOwner().getUserId())
            .ownerName(v.getOwner().getFirstName() + " " + v.getOwner().getLastName())
            .vin(v.getVin())
            .make(v.getMake())
            .model(v.getModel())
            .year(v.getYear())
            .odometer(v.getOdometer())
            .createdAt(v.getCreatedAt())
            .build();
    }
}
