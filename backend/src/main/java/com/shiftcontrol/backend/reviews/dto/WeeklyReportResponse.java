package com.shiftcontrol.backend.reviews.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record WeeklyReportResponse(
        UUID storeId,
        LocalDate weekStart,
        LocalDate weekEnd,
        List<WeeklyStaffSummaryResponse> staffSummaries
) {
}