package com.shiftcontrol.backend.reports.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DailyReportResponse(
        UUID storeId,
        String storeName,

        LocalDate date,

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
        int resolvedIncidentsCount,

        List<DailyStaffSummaryResponse> staffSummaries
) {
}