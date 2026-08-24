package com.autocare.service;

import com.autocare.dto.ReminderResponse;
import com.autocare.entity.Reminder;
import com.autocare.entity.Role;
import com.autocare.repository.ReminderRepository;
import com.autocare.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReminderService {

    private final ReminderRepository reminderRepository;

    @Transactional(readOnly = true)
    public List<ReminderResponse> getReminders(UserPrincipal principal) {
        List<Reminder> reminders;
        if (principal.getRole() == Role.CUSTOMER) {
            reminders = reminderRepository.findAllByOwnerId(principal.getUserId());
        } else {
            // For mechanics/admins, return all
            reminders = reminderRepository.findAll();
        }

        return reminders.stream()
            .map(r -> ReminderResponse.builder()
                .reminderId(r.getReminderId())
                .vehicleId(r.getVehicle().getVehicleId())
                .vehicleInfo(r.getVehicle().getYear() + " " + r.getVehicle().getMake() + " " + r.getVehicle().getModel())
                .reminderType(r.getReminderType())
                .dueDate(r.getDueDate())
                .message(r.getMessage())
                .status(r.getStatus())
                .build())
            .toList();
    }
}
