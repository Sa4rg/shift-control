package com.shiftcontrol.backend.auth.service;

import com.shiftcontrol.backend.auth.dto.AdminLoginRequest;
import com.shiftcontrol.backend.auth.dto.AuthResponse;
import com.shiftcontrol.backend.auth.dto.AuthenticatedUserResponse;
import com.shiftcontrol.backend.auth.dto.StaffLoginRequest;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.security.JwtService;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.jwt.access-token-expiration-seconds}")
    private long accessTokenExpirationSeconds;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse loginStaff(StaffLoginRequest request) {
        String username = request.username().trim();

        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new BusinessException("Invalid credentials"));

        if (user.getRole() != Role.STAFF) {
            throw new BusinessException("Invalid credentials");
        }

        if (!user.isActive()) {
            throw new BusinessException("Invalid credentials");
        }

        if (!passwordEncoder.matches(request.pin(), user.getPinHash())) {
            throw new BusinessException("Invalid credentials");
        }

        String token = jwtService.generateAccessToken(user);

        return new AuthResponse(
                token,
                "Bearer",
                accessTokenExpirationSeconds,
                AuthenticatedUserResponse.fromEntity(user)
        );
    }

    public AuthResponse loginAdmin(AdminLoginRequest request) {
        String username = request.username().trim();

        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new BusinessException("Invalid credentials"));

        if (user.getRole() != Role.ADMIN) {
            throw new BusinessException("Invalid credentials");
        }

        if (!user.isActive()) {
            throw new BusinessException("Invalid credentials");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException("Invalid credentials");
        }

        String token = jwtService.generateAccessToken(user);

        return new AuthResponse(
                token,
                "Bearer",
                accessTokenExpirationSeconds,
                AuthenticatedUserResponse.fromEntity(user)
        );
    }
}
