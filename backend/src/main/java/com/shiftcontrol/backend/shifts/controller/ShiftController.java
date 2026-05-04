package com.shiftcontrol.backend.shifts.controller;

import com.shiftcontrol.backend.shared.response.ApiResponse;
import com.shiftcontrol.backend.shifts.dto.OpenShiftRequest;
import com.shiftcontrol.backend.shifts.dto.ShiftResponse;
import com.shiftcontrol.backend.shifts.service.ShiftService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.shiftcontrol.backend.users.model.Role;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    private final ShiftService shiftService;

    public ShiftController(ShiftService shiftService) {
        this.shiftService = shiftService;
    }

    @PostMapping("/open")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ShiftResponse> openShift(
            Authentication authentication,
            @Valid @RequestBody OpenShiftRequest request
    ) {
        UUID staffId = UUID.fromString(authentication.getName());

        ShiftResponse response = ShiftResponse.fromEntity(
                shiftService.openShift(staffId, request)
        );

        return ApiResponse.ok("Shift opened successfully", response);
    }

    @GetMapping("/current")
    public ApiResponse<ShiftResponse> getCurrentShift(Authentication authentication) {
        UUID staffId = UUID.fromString(authentication.getName());

        ShiftResponse response = ShiftResponse.fromEntity(
                shiftService.getCurrentShift(staffId)
        );

        return ApiResponse.ok("Current shift retrieved successfully", response);
    }

    @GetMapping("/{id}")
    public ApiResponse<ShiftResponse> getById(@PathVariable UUID id) {
        ShiftResponse response = ShiftResponse.fromEntity(
                shiftService.getById(id)
        );

        return ApiResponse.ok("Shift retrieved successfully", response);
    }

    @GetMapping
    public ApiResponse<List<ShiftResponse>> listShifts(Authentication authentication) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());

        String authority = authentication.getAuthorities()
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Authenticated user has no role"))
                .getAuthority();

        Role authenticatedRole = Role.valueOf(authority.replace("ROLE_", ""));

        List<ShiftResponse> response = shiftService.listShifts(authenticatedUserId, authenticatedRole)
                .stream()
                .map(ShiftResponse::fromEntity)
                .toList();

        return ApiResponse.ok("Shifts retrieved successfully", response);
    }
}