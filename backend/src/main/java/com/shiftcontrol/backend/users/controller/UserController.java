package com.shiftcontrol.backend.users.controller;

import com.shiftcontrol.backend.shared.response.ApiResponse;
import com.shiftcontrol.backend.users.dto.CreateAdminRequest;
import com.shiftcontrol.backend.users.dto.CreateStaffRequest;
import com.shiftcontrol.backend.users.dto.UserResponse;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping({"", "/"})
    public ApiResponse<List<UserResponse>> listUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        List<UserResponse> users = userService.listUsers(role, includeInactive)
                .stream()
                .map(UserResponse::fromEntity)
                .toList();
        return ApiResponse.ok("Users retrieved successfully", users);
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getUserById(@PathVariable UUID id) {
        UserResponse response = UserResponse.fromEntity(userService.getById(id));
        return ApiResponse.ok("User retrieved successfully", response);
    }

    @PatchMapping("/{id}/deactivate")
    public ApiResponse<UserResponse> deactivateUser(@PathVariable UUID id) {
        UserResponse response = UserResponse.fromEntity(userService.deactivateUser(id));
        return ApiResponse.ok("User deactivated successfully", response);
    }

    @PostMapping("/staff")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        UserResponse response = UserResponse.fromEntity(userService.createStaff(request));
        return ApiResponse.ok("Staff user created successfully", response);
    }

    @PostMapping("/admin")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> createAdmin(@Valid @RequestBody CreateAdminRequest request) {
        UserResponse response = UserResponse.fromEntity(userService.createAdmin(request));
        return ApiResponse.ok("Admin user created successfully", response);
    }
}
