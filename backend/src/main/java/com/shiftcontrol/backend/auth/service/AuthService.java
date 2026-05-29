package com.shiftcontrol.backend.auth.service;

import com.shiftcontrol.backend.auth.dto.AdminLoginRequest;
import com.shiftcontrol.backend.auth.dto.AuthResponse;
import com.shiftcontrol.backend.auth.dto.AuthenticatedUserResponse;
import com.shiftcontrol.backend.auth.dto.StaffLoginRequest;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shared.security.JwtService;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

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
                .orElseThrow(() -> {
                    log.warn("Login attempt failed [role=STAFF]");
                    return new BusinessException("Invalid credentials");
                });

        if (user.getRole() != Role.STAFF) {
            log.warn("Login attempt failed [role=STAFF]");
            throw new BusinessException("Invalid credentials");
        }

        if (!user.isActive()) {
            log.warn("Login attempt failed [role=STAFF]");
            throw new BusinessException("Invalid credentials");
        }

        if (!passwordEncoder.matches(request.pin(), user.getPinHash())) {
            log.warn("Login attempt failed [role=STAFF]");
            throw new BusinessException("Invalid credentials");
        }

        String token = jwtService.generateAccessToken(user);
        log.info("Login successful [role=STAFF, userId={}]", user.getId());
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
                .orElseThrow(() -> {
                    log.warn("Login attempt failed [role=ADMIN]");
                    return new BusinessException("Invalid credentials");
                });

        if (user.getRole() != Role.ADMIN) {
            log.warn("Login attempt failed [role=ADMIN]");
            throw new BusinessException("Invalid credentials");
        }

        if (!user.isActive()) {
            log.warn("Login attempt failed [role=ADMIN]");
            throw new BusinessException("Invalid credentials");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.warn("Login attempt failed [role=ADMIN]");
            throw new BusinessException("Invalid credentials");
        }

        String token = jwtService.generateAccessToken(user);
        log.info("Login successful [role=ADMIN, userId={}]", user.getId());
        return new AuthResponse(
                token,
                "Bearer",
                accessTokenExpirationSeconds,
                AuthenticatedUserResponse.fromEntity(user)
        );
    }

    public AuthenticatedUserResponse getCurrentUser(UUID authenticatedUserId) {
        User user = userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!user.isActive()) {
            throw new BusinessException("User is inactive");
        }

        return AuthenticatedUserResponse.fromEntity(user);
    }
}
