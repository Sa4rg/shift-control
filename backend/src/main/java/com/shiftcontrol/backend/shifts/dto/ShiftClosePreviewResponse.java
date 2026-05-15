package com.shiftcontrol.backend.shifts.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ShiftClosePreviewResponse(
        UUID shiftId,
        UUID staffId,
        String staffName,
        UUID storeId,
        String storeName,
        BigDecimal totalCash,
        BigDecimal totalMb,
        BigDecimal totalGlovoOnline,
        BigDecimal totalGlovoCash,
        BigDecimal totalSales,
        BigDecimal pendingInvoiceTotal,
        BigDecimal cashToWithdraw,
        BigDecimal expectedPhysicalCash
) {
}
