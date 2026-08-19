package com.autocare.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * CUSTOMER (EER Subtype of USER)
 * Primary Key 'user_id' is simultaneously Foreign Key to 'user.user_id'.
 */
@Entity
@Table(name = "customer")
@PrimaryKeyJoinColumn(name = "user_id")
@DiscriminatorValue("CUSTOMER")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Customer extends User {

    @Column(name = "phone", length = 20)
    private String phone;
}
