package com.autocare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SolutionReportResponse {
    private Integer solutionId;
    private String description;
    private String probableCause;
    private String recommendedAction;
    private String urgency;
    private BigDecimal confidenceScore;
    private Integer reviewedBy;
    private String reviewerName;
    private List<String> keywords;
}
