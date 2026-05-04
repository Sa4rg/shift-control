package com.shiftcontrol.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminLoginRequest(
        @NotBlank @Size(max = 80) String username,
        @NotBlank @Size(max = 120) String password
) {}
