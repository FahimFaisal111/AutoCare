package com.autocare.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentStatusUpdateRequest {

    @NotBlank(message = "Status is required")
    private String status; // 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'

    private BigDecimal partsCost;
    private BigDecimal laborCost;
    private String serviceDescription;
}
