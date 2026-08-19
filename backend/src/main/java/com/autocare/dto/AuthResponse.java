package com.autocare.dto;

import com.autocare.entity.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private Integer userId;
    private Integer workshopId;
    private String workshopName;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
}
