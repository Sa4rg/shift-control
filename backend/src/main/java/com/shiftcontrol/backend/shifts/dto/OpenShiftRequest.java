package com.shiftcontrol.backend.shifts.dto;

import com.shiftcontrol.backend.shifts.model.ShiftType;
import jakarta.validation.constraints.NotNull;

public record OpenShiftRequest(
        @NotNull
        ShiftType type
) {
}