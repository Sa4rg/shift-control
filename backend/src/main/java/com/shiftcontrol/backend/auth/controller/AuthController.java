package com.shiftcontrol.backend.auth.controller;

import com.shiftcontrol.backend.auth.dto.AdminLoginRequest;
import com.shiftcontrol.backend.auth.dto.AuthResponse;
import com.shiftcontrol.backend.auth.dto.StaffLoginRequest;
import com.shiftcontrol.backend.auth.service.AuthService;
import com.shiftcontrol.backend.shared.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/staff/login")
    public ApiResponse<AuthResponse> loginStaff(@Valid @RequestBody StaffLoginRequest request) {
        AuthResponse response = authService.loginStaff(request);
        return ApiResponse.ok("Login successful", response);
    }

    @PostMapping("/admin/login")
    public ApiResponse<AuthResponse> loginAdmin(@Valid @RequestBody AdminLoginRequest request) {
        AuthResponse response = authService.loginAdmin(request);
        return ApiResponse.ok("Login successful", response);
    }
}
