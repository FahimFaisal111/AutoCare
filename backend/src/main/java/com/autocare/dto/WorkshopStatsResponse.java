package com.autocare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkshopStatsResponse {
    private Integer workshopId;
    private String workshopName;
    private String workshopAddress;
    private String accessCode;
    private long customerCount;
    private long vehicleCount;
    private long mechanicCount;
    private long scheduledAppointmentsCount;
    private long completedAppointmentsCount;
    private BigDecimal totalRevenue;
}
