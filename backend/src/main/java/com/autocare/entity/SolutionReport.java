package com.autocare.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * SOLUTION_REPORT (AI-Generated Diagnostic Synthesis)
 * 1:1 relationship with ProblemReport.
 */
@Entity
@Table(name = "solution_report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolutionReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "solution_id")
    private Integer solutionId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false, unique = true)
    private ProblemReport problemReport;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "probable_cause", nullable = false, columnDefinition = "TEXT")
    private String probableCause;

    @Column(name = "recommended_action", nullable = false, columnDefinition = "TEXT")
    private String recommendedAction;

    @Column(name = "urgency", nullable = false, length = 10)
    private String urgency;

    @Column(name = "confidence_score", precision = 4, scale = 3)
    private BigDecimal confidenceScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "solutionReport", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SolutionKeyword> keywords = new ArrayList<>();
}
