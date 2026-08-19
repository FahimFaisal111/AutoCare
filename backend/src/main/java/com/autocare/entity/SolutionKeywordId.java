package com.autocare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

/**
 * Composite Primary Key for SOLUTION_KEYWORD table.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SolutionKeywordId implements Serializable {

    @Column(name = "solution_id")
    private Integer solutionId;

    @Column(name = "symptom_keyword", length = 50)
    private String symptomKeyword;
}
