package com.shiftcontrol.backend.users.dto;

import java.util.UUID;

public record MonthlyWorkHoursResponse(
        UUID staffId,
        String staffName,
        int year,
        int month,
        long totalMinutes,
        int closedShiftCount
) {
}
