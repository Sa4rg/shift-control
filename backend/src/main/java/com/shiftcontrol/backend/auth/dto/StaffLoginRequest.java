package com.shiftcontrol.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StaffLoginRequest(
        @NotBlank @Size(max = 80) String username,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "PIN must contain exactly 6 digits") String pin
) {}
