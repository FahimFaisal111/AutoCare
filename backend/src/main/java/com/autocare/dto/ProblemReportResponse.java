package com.autocare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemReportResponse {
    private Integer reportId;
    private Integer customerId;
    private String customerName;
    private Integer vehicleId;
    private String vehicleInfo;
    private String description;
    private String status;
    private LocalDateTime createdAt;
    private SolutionReportResponse solution;
}
