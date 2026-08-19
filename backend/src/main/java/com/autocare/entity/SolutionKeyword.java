package com.autocare.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * SOLUTION_KEYWORD (Normalized Multi-Valued Symptom Tokens - 1NF)
 * Identifying Weak Entity dependent on SolutionReport.
 */
@Entity
@Table(name = "solution_keyword")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolutionKeyword {

    @EmbeddedId
    private SolutionKeywordId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("solutionId")
    @JoinColumn(name = "solution_id")
    private SolutionReport solutionReport;
}
