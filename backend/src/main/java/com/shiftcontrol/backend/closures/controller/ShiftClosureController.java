package com.shiftcontrol.backend.closures.controller;

import com.shiftcontrol.backend.closures.dto.ShiftClosureResponse;
import com.shiftcontrol.backend.closures.service.ShiftClosureService;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.response.ApiResponse;
import com.shiftcontrol.backend.users.model.Role;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/closures")
public class ShiftClosureController {

    private final ShiftClosureService shiftClosureService;

    public ShiftClosureController(ShiftClosureService shiftClosureService) {
        this.shiftClosureService = shiftClosureService;
    }

    @GetMapping("/{id}")
    public ApiResponse<ShiftClosureResponse> getById(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());
        Role authenticatedRole = extractRole(authentication);

        ShiftClosureResponse response = ShiftClosureResponse.fromEntity(
                shiftClosureService.getById(id, authenticatedUserId, authenticatedRole)
        );

        return ApiResponse.ok("Closure retrieved successfully", response);
    }

    @GetMapping
    public ApiResponse<ShiftClosureResponse> getByShiftId(
            @RequestParam(required = false) UUID shiftId,
            Authentication authentication
    ) {
        if (shiftId == null) {
            throw new BusinessException("shiftId is required");
        }

        UUID authenticatedUserId = UUID.fromString(authentication.getName());
        Role authenticatedRole = extractRole(authentication);

        ShiftClosureResponse response = ShiftClosureResponse.fromEntity(
                shiftClosureService.getByShiftId(shiftId, authenticatedUserId, authenticatedRole)
        );

        return ApiResponse.ok("Closure retrieved successfully", response);
    }

    private Role extractRole(Authentication authentication) {
        String authority = authentication.getAuthorities()
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Authenticated user has no role"))
                .getAuthority();

        return Role.valueOf(authority.replace("ROLE_", ""));
    }
}