package com.shiftcontrol.backend.reviews.dto;

import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateWeeklyAdminReviewRequest(

        @NotNull
        UUID storeId,

        @NotNull
        UUID staffId,

        @NotNull
        LocalDate weekStart,

        @NotNull
        WeeklyAdminReviewStatus status,

        @Size(max = 1000)
        String note
) {
}