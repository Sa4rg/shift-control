package com.shiftcontrol.backend.reviews.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record WeeklyStaffSummaryResponse(
        UUID storeId,
        String storeName,
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
        int incidentCount
) {
}