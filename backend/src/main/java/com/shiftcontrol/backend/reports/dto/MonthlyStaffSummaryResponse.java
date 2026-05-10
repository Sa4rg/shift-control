package com.shiftcontrol.backend.reports.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record MonthlyStaffSummaryResponse(
        UUID staffId,
        String staffName,

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

        int openIncidentsCount,
        int resolvedIncidentsCount,

        int weeklyReviewsCount,
        int weeklyReviewsOkCount,
        int weeklyReviewsWithIncidentCount
) {
}