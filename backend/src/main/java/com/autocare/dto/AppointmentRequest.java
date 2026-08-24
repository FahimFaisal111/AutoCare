package com.autocare.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentRequest {

    @NotNull(message = "Vehicle ID is required")
    private Integer vehicleId;

    @NotNull(message = "Mechanic ID is required")
    private Integer mechanicId;

    private Integer reportId;

    @NotNull(message = "Scheduled start time is required")
    private LocalDateTime scheduledStart;

    @NotNull(message = "Duration in minutes is required")
    @Min(value = 15, message = "Duration must be at least 15 minutes")
    private Integer durationMinutes;

    private String serviceDescription;
}
