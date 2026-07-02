package com.shiftcontrol.backend.shifts.dto;

import com.shiftcontrol.backend.shifts.model.ShiftType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OpenShiftRequest(

        @NotNull
        ShiftType type,

        @NotBlank
        @Size(max = 32)
        String wifiSsid
) {
}