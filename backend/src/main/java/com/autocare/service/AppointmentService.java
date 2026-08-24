package com.autocare.service;

import com.autocare.dto.AppointmentRequest;
import com.autocare.dto.AppointmentResponse;
import com.autocare.dto.AppointmentStatusUpdateRequest;
import com.autocare.entity.*;
import com.autocare.exception.ConflictException;
import com.autocare.exception.ForbiddenException;
import com.autocare.exception.ResourceNotFoundException;
import com.autocare.repository.*;
import com.autocare.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final ProblemReportRepository problemReportRepository;
    private final InvoiceRepository invoiceRepository;

    @Transactional
    public AppointmentResponse createAppointment(AppointmentRequest request, UserPrincipal principal) {
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
            .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (!vehicle.getOwner().getWorkshop().getWorkshopId().equals(principal.getWorkshopId())) {
            throw new ForbiddenException("Vehicle belongs to another workshop tenant.");
        }

        if (principal.getRole() == Role.CUSTOMER && !vehicle.getOwner().getUserId().equals(principal.getUserId())) {
            throw new ForbiddenException("You can only book appointments for your own vehicles.");
        }

        User mechanic = userRepository.findById(request.getMechanicId())
            .orElseThrow(() -> new ResourceNotFoundException("Mechanic not found"));

        if (!mechanic.getWorkshop().getWorkshopId().equals(principal.getWorkshopId())) {
            throw new ForbiddenException("Mechanic belongs to another workshop.");
        }

        if (mechanic.getRole() != Role.MECHANIC) {
            throw new ConflictException("Selected staff member is not a certified mechanic.");
        }

        LocalDateTime startTime = request.getScheduledStart();
        LocalDateTime endTime = startTime.plusMinutes(request.getDurationMinutes());

        // Mathematical non-overlapping interval query
        long overlaps = appointmentRepository.countOverlappingAppointments(mechanic.getUserId(), startTime, endTime);
        if (overlaps > 0) {
            throw new ConflictException("Technician " + mechanic.getFirstName() + " " + mechanic.getLastName() +
                " is already booked during this time window. Please choose another slot or mechanic.");
        }

        ProblemReport report = null;
        if (request.getReportId() != null) {
            report = problemReportRepository.findById(request.getReportId()).orElse(null);
        }

        Appointment appointment = Appointment.builder()
            .vehicle(vehicle)
            .mechanic(mechanic)
            .problemReport(report)
            .scheduledStart(startTime)
            .durationMinutes(request.getDurationMinutes())
            .status("SCHEDULED")
            .serviceDescription(request.getServiceDescription())
            .partsCost(BigDecimal.ZERO)
            .laborCost(BigDecimal.ZERO)
            .build();

        Appointment savedAppointment = appointmentRepository.save(appointment);
        return mapToResponse(savedAppointment);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointments(UserPrincipal principal) {
        List<Appointment> list;
        if (principal.getRole() == Role.CUSTOMER) {
            list = appointmentRepository.findAllByCustomerId(principal.getUserId());
        } else if (principal.getRole() == Role.MECHANIC) {
            list = appointmentRepository.findAllByMechanicId(principal.getUserId());
        } else {
            list = appointmentRepository.findAllByWorkshopId(principal.getWorkshopId());
        }
        return list.stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(Integer id, UserPrincipal principal) {
        Appointment appointment = appointmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        if (!appointment.getMechanic().getWorkshop().getWorkshopId().equals(principal.getWorkshopId())) {
            throw new ForbiddenException("Unauthorized access to appointment outside your tenant.");
        }

        return mapToResponse(appointment);
    }

    @Transactional
    public AppointmentResponse updateAppointmentStatus(
        Integer appointmentId,
        AppointmentStatusUpdateRequest request,
        UserPrincipal principal
    ) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        if (!appointment.getMechanic().getWorkshop().getWorkshopId().equals(principal.getWorkshopId())) {
            throw new ForbiddenException("Unauthorized access to appointment outside your tenant.");
        }

        if (principal.getRole() == Role.CUSTOMER) {
            throw new ForbiddenException("Customers cannot modify service work order statuses.");
        }

        appointment.setStatus(request.getStatus().toUpperCase());

        if (request.getPartsCost() != null) {
            appointment.setPartsCost(request.getPartsCost());
        }
        if (request.getLaborCost() != null) {
            appointment.setLaborCost(request.getLaborCost());
        }
        if (request.getServiceDescription() != null && !request.getServiceDescription().isBlank()) {
            appointment.setServiceDescription(request.getServiceDescription().trim());
        }

        // If completed, automatically provision invoice and resolve linked problem report
        if ("COMPLETED".equalsIgnoreCase(request.getStatus())) {
            BigDecimal totalAmount = appointment.getPartsCost().add(appointment.getLaborCost());

            Invoice invoice = invoiceRepository.findByAppointment_AppointmentId(appointmentId)
                .orElseGet(() -> Invoice.builder()
                    .appointment(appointment)
                    .totalAmount(totalAmount)
                    .status("PENDING")
                    .build());

            invoice.setTotalAmount(totalAmount);
            invoiceRepository.save(invoice);
            appointment.setInvoice(invoice);

            if (appointment.getProblemReport() != null) {
                appointment.getProblemReport().setStatus("RESOLVED");
                problemReportRepository.save(appointment.getProblemReport());
            }
        }

        Appointment savedAppointment = appointmentRepository.save(appointment);
        return mapToResponse(savedAppointment);
    }

    private AppointmentResponse mapToResponse(Appointment a) {
        BigDecimal totalAmount = (a.getPartsCost() != null ? a.getPartsCost() : BigDecimal.ZERO)
            .add(a.getLaborCost() != null ? a.getLaborCost() : BigDecimal.ZERO);

        String invoiceStatus = a.getInvoice() != null ? a.getInvoice().getStatus() : null;

        return AppointmentResponse.builder()
            .appointmentId(a.getAppointmentId())
            .vehicleId(a.getVehicle().getVehicleId())
            .vehicleInfo(a.getVehicle().getYear() + " " + a.getVehicle().getMake() + " " + a.getVehicle().getModel() + " (" + a.getVehicle().getVin() + ")")
            .ownerId(a.getVehicle().getOwner().getUserId())
            .ownerName(a.getVehicle().getOwner().getFirstName() + " " + a.getVehicle().getOwner().getLastName())
            .mechanicId(a.getMechanic().getUserId())
            .mechanicName(a.getMechanic().getFirstName() + " " + a.getMechanic().getLastName())
            .reportId(a.getProblemReport() != null ? a.getProblemReport().getReportId() : null)
            .scheduledStart(a.getScheduledStart())
            .durationMinutes(a.getDurationMinutes())
            .status(a.getStatus())
            .serviceDescription(a.getServiceDescription())
            .partsCost(a.getPartsCost())
            .laborCost(a.getLaborCost())
            .totalAmount(totalAmount)
            .invoiceStatus(invoiceStatus)
            .createdAt(a.getCreatedAt())
            .build();
    }
}
