package com.shiftcontrol.backend.reports.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record DailyStaffSummaryResponse(
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

        int activeSalesCount,
        int cancelledSalesCount,

        int openIncidentsCount,
        int resolvedIncidentsCount
) {
}