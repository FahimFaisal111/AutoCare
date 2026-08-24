package com.autocare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReminderResponse {
    private Integer reminderId;
    private Integer vehicleId;
    private String vehicleInfo;
    private String reminderType;
    private LocalDate dueDate;
    private String message;
    private String status;
}
