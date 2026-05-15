package com.shiftcontrol.backend.auth.dto;

import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;

import java.util.UUID;

public record AuthenticatedUserResponse(
        UUID id,
        String username,
        String fullName,
        Role role,
        UUID storeId
) {
    public static AuthenticatedUserResponse fromEntity(User user) {
        return new AuthenticatedUserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole(),
                user.getStore() != null ? user.getStore().getId() : null
        );
    }
}
