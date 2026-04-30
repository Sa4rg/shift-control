package com.shiftcontrol.backend.users.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateStaffRequest(

        @NotBlank
        @Size(max = 120)
        String fullName,

        @NotBlank
        @Size(max = 80)
        String username,

        @NotBlank
        @Pattern(regexp = "\\d{6}", message = "PIN must contain exactly 6 digits")
        String pin,

        @NotNull
        UUID storeId
) {}
