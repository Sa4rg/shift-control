package com.shiftcontrol.backend.shifts.dto;

import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.model.ShiftType;

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
        UUID closedById
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
                shift.getClosedBy() != null ? shift.getClosedBy().getId() : null
        );
    }
}