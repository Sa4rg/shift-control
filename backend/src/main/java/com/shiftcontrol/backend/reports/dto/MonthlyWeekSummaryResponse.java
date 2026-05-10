package com.shiftcontrol.backend.reports.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MonthlyWeekSummaryResponse(
        LocalDate weekStart,
        LocalDate weekEnd,

        BigDecimal totalCash,
        BigDecimal totalMb,
        BigDecimal totalGlovoOnline,
        BigDecimal totalGlovoCash,
        BigDecimal totalSales,
        BigDecimal pendingInvoiceTotal,

        BigDecimal cashDifferenceTotal,
        BigDecimal mbDifferenceTotal,

        int closuresCount,
        int closedOkCount,
        int closedWithIncidentCount,

        int weeklyReviewsCount,
        int weeklyReviewsOkCount,
        int weeklyReviewsWithIncidentCount
) {
}