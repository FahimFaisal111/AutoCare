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
public class VehicleResponse {
    private Integer vehicleId;
    private Integer ownerId;
    private String ownerName;
    private String vin;
    private String make;
    private String model;
    private Integer year;
    private Integer odometer;
    private LocalDateTime createdAt;
}
