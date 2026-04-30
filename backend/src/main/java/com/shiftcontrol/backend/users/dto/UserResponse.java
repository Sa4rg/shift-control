package com.shiftcontrol.backend.users.dto;

import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String fullName,
        String username,
        String email,
        Role role,
        UUID storeId,
        boolean active
) {
    public static UserResponse fromEntity(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getStore() != null ? user.getStore().getId() : null,
                user.isActive()
        );
    }
}
