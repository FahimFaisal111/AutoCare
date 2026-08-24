package com.autocare.controller;

import com.autocare.dto.ReminderResponse;
import com.autocare.security.UserPrincipal;
import com.autocare.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> getReminders(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<ReminderResponse> response = reminderService.getReminders(principal);
        return ResponseEntity.ok(response);
    }
}
