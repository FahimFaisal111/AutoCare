package com.autocare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {
    private Integer appointmentId;
    private Integer vehicleId;
    private String vehicleInfo;
    private Integer ownerId;
    private String ownerName;
    private Integer mechanicId;
    private String mechanicName;
    private Integer reportId;
    private LocalDateTime scheduledStart;
    private Integer durationMinutes;
    private String status;
    private String serviceDescription;
    private BigDecimal partsCost;
    private BigDecimal laborCost;
    private BigDecimal totalAmount;
    private String invoiceStatus;
    private LocalDateTime createdAt;
}
