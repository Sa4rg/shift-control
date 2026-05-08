package com.shiftcontrol.backend.closures.dto;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ShiftClosureResponse(
        UUID id,
        UUID shiftId,
        UUID closedById,

        BigDecimal totalCash,
        BigDecimal totalMb,
        BigDecimal totalGlovoOnline,
        BigDecimal totalGlovoCash,
        BigDecimal totalSales,
        BigDecimal pendingInvoiceTotal,

        BigDecimal cashToWithdraw,
        BigDecimal expectedPhysicalCash,

        BigDecimal confirmedCashAmount,
        BigDecimal confirmedMbAmount,

        BigDecimal cashDifference,
        BigDecimal mbDifference,

        ClosureStatus status,
        String note,

        Instant createdAt,
        Instant updatedAt
) {
    public static ShiftClosureResponse fromEntity(ShiftClosure closure) {
        return new ShiftClosureResponse(
                closure.getId(),
                closure.getShift().getId(),
                closure.getClosedBy().getId(),

                closure.getTotalCash(),
                closure.getTotalMb(),
                closure.getTotalGlovoOnline(),
                closure.getTotalGlovoCash(),
                closure.getTotalSales(),
                closure.getPendingInvoiceTotal(),

                closure.getCashToWithdraw(),
                closure.getExpectedPhysicalCash(),

                closure.getConfirmedCashAmount(),
                closure.getConfirmedMbAmount(),

                closure.getCashDifference(),
                closure.getMbDifference(),

                closure.getStatus(),
                closure.getNote(),

                closure.getCreatedAt(),
                closure.getUpdatedAt()
        );
    }
}