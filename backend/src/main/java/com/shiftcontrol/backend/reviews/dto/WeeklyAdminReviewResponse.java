package com.shiftcontrol.backend.reviews.dto;

import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WeeklyAdminReviewResponse(
        UUID id,

        UUID storeId,
        String storeName,

        UUID staffId,
        String staffName,

        UUID reviewedById,
        String reviewedByName,

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
        int incidentCount,

        WeeklyAdminReviewStatus status,
        String note,

        Instant createdAt,
        Instant updatedAt
) {
    public static WeeklyAdminReviewResponse fromEntity(WeeklyAdminReview review) {
        return new WeeklyAdminReviewResponse(
                review.getId(),

                review.getStore().getId(),
                review.getStore().getName(),

                review.getStaff().getId(),
                review.getStaff().getFullName(),

                review.getReviewedBy().getId(),
                review.getReviewedBy().getFullName(),

                review.getWeekStart(),
                review.getWeekEnd(),

                review.getTotalCash(),
                review.getTotalMb(),
                review.getTotalGlovoOnline(),
                review.getTotalGlovoCash(),
                review.getTotalSales(),
                review.getPendingInvoiceTotal(),

                review.getCashDifferenceTotal(),
                review.getMbDifferenceTotal(),

                review.getClosuresCount(),
                review.getIncidentCount(),

                review.getStatus(),
                review.getNote(),

                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}