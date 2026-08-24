package com.autocare.service;

import com.autocare.dto.UserProfileResponse;
import com.autocare.dto.WorkshopStatsResponse;
import com.autocare.entity.Role;
import com.autocare.entity.User;
import com.autocare.entity.Workshop;
import com.autocare.exception.ForbiddenException;
import com.autocare.exception.ResourceNotFoundException;
import com.autocare.repository.*;
import com.autocare.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkshopService {

    private final WorkshopRepository workshopRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public WorkshopStatsResponse getWorkshopStats(UserPrincipal principal) {
        if (principal.getRole() != Role.ADMIN) {
            throw new ForbiddenException("Only workshop administrators can access full tenant telemetry.");
        }

        Workshop workshop = workshopRepository.findById(principal.getWorkshopId())
            .orElseThrow(() -> new ResourceNotFoundException("Workshop not found"));

        Integer workshopId = workshop.getWorkshopId();

        long customerCount = userRepository.countByWorkshopIdAndRole(workshopId, Role.CUSTOMER);
        long vehicleCount = vehicleRepository.countByWorkshopId(workshopId);
        long mechanicCount = userRepository.countByWorkshopIdAndRole(workshopId, Role.MECHANIC);
        long scheduledAppointments = appointmentRepository.countByWorkshopIdAndStatus(workshopId, "SCHEDULED")
            + appointmentRepository.countByWorkshopIdAndStatus(workshopId, "IN_PROGRESS");
        long completedAppointments = appointmentRepository.countByWorkshopIdAndStatus(workshopId, "COMPLETED");
        BigDecimal totalRevenue = invoiceRepository.sumTotalRevenueByWorkshopId(workshopId);

        return WorkshopStatsResponse.builder()
            .workshopId(workshopId)
            .workshopName(workshop.getName())
            .workshopAddress(workshop.getAddress())
            .accessCode(workshop.getAccessCode())
            .customerCount(customerCount)
            .vehicleCount(vehicleCount)
            .mechanicCount(mechanicCount)
            .scheduledAppointmentsCount(scheduledAppointments)
            .completedAppointmentsCount(completedAppointments)
            .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
            .build();
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getWorkshopMechanics(UserPrincipal principal) {
        List<User> mechanics = userRepository.findAllByWorkshopIdAndRole(principal.getWorkshopId(), Role.MECHANIC);
        return mechanics.stream()
            .map(u -> UserProfileResponse.builder()
                .userId(u.getUserId())
                .workshopId(u.getWorkshop().getWorkshopId())
                .workshopName(u.getWorkshop().getName())
                .email(u.getEmail())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .role(u.getRole())
                .build())
            .toList();
    }
}
