package com.autocare.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * MECHANIC (EER Subtype of USER)
 * Holds mechanic staff identification badge code with UNIQUE constraint.
 */
@Entity
@Table(name = "mechanic")
@PrimaryKeyJoinColumn(name = "user_id")
@DiscriminatorValue("MECHANIC")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Mechanic extends User {

    @Column(name = "employee_code", nullable = false, unique = true, length = 20)
    private String employeeCode;
}
