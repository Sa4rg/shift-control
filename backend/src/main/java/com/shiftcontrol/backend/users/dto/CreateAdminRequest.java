package com.shiftcontrol.backend.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateAdminRequest(

        @NotBlank
        @Size(max = 120)
        String fullName,

        @NotBlank
        @Size(max = 80)
        String username,

        @NotBlank
        @Email
        @Size(max = 160)
        String email,

        @NotBlank
        @Size(min = 8, max = 120)
        String password
) {}
