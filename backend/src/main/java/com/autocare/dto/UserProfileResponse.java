package com.autocare.dto;

import com.autocare.entity.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {

    private Integer userId;
    private Integer workshopId;
    private String workshopName;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
    private String phone;
    private String employeeCode;
}
