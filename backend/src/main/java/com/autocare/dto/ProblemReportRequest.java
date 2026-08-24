package com.autocare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemReportRequest {

    @NotNull(message = "Vehicle ID is required")
    private Integer vehicleId;

    @NotBlank(message = "Problem description is required")
    private String description;
}
