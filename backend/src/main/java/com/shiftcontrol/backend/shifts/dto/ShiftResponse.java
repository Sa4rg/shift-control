package com.shiftcontrol.backend.shifts.dto;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.model.ShiftType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ShiftResponse(
        UUID id,
        UUID staffId,
        String staffName,
        UUID storeId,
        String storeName,
        ShiftType type,
        ShiftStatus status,
        Instant openedAt,
        Instant closedAt,
        UUID closedById,
        ClosureStatus closureStatus,
        BigDecimal cashDifference,
        BigDecimal mbDifference,
        long openIncidentCount,
        long totalIncidentCount
) {
    public static ShiftResponse fromEntity(Shift shift) {
        return new ShiftResponse(
                shift.getId(),
                shift.getStaff().getId(),
                shift.getStaff().getFullName(),
                shift.getStore().getId(),
                shift.getStore().getName(),
                shift.getType(),
                shift.getStatus(),
                shift.getOpenedAt(),
                shift.getClosedAt(),
                shift.getClosedBy() != null ? shift.getClosedBy().getId() : null,
                null,
                null,
                null,
                0,
                0
        );
    }
    public static ShiftResponse fromEntity(
            Shift shift,
            ShiftClosure closure,
            long openIncidentCount,
            long totalIncidentCount
    ) {
        return new ShiftResponse(
                shift.getId(),
                shift.getStaff().getId(),
                shift.getStaff().getFullName(),
                shift.getStore().getId(),
                shift.getStore().getName(),
                shift.getType(),
                shift.getStatus(),
                shift.getOpenedAt(),
                shift.getClosedAt(),
                shift.getClosedBy() != null ? shift.getClosedBy().getId() : null,
                closure != null ? closure.getStatus() : null,
                closure != null ? closure.getCashDifference() : null,
                closure != null ? closure.getMbDifference() : null,
                openIncidentCount,
                totalIncidentCount
        );
    }
}