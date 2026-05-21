package com.shiftcontrol.backend.reviews.repository;

import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WeeklyAdminReviewRepository extends JpaRepository<WeeklyAdminReview, UUID> {

    boolean existsByStoreAndStaffAndWeekStart(Store store, User staff, LocalDate weekStart);

    @EntityGraph(attributePaths = {
            "store",
            "staff",
            "reviewedBy"
    })
    Optional<WeeklyAdminReview> findWithDetailsById(UUID id);

    @EntityGraph(attributePaths = {
            "store",
            "staff",
            "reviewedBy"
    })
    List<WeeklyAdminReview> findAllByOrderByWeekStartDescCreatedAtDesc();

    @EntityGraph(attributePaths = {
            "store",
            "staff",
            "reviewedBy"
    })
    List<WeeklyAdminReview> findByStoreAndWeekStartOrderByCreatedAtDesc(Store store, LocalDate weekStart);

    @EntityGraph(attributePaths = {
                "store",
                "staff",
                "reviewedBy"
        })
        @Query("""
        SELECT r FROM WeeklyAdminReview r
        WHERE r.store.id = :storeId
        AND r.weekStart >= :from
        AND r.weekStart < :to
        ORDER BY r.weekStart ASC, r.staff.fullName ASC
        """)
        List<WeeklyAdminReview> findByStoreAndWeekStartBetweenWithDetails(
                @Param("storeId") UUID storeId,
                @Param("from") LocalDate from,
                @Param("to") LocalDate to
        );

    @Query("""
        SELECT r FROM WeeklyAdminReview r
        JOIN FETCH r.store
        JOIN FETCH r.staff
        JOIN FETCH r.reviewedBy
        WHERE (:storeId IS NULL OR r.store.id = :storeId)
        AND (:staffId IS NULL OR r.staff.id = :staffId)
        AND (:weekStartStr IS NULL OR cast(r.weekStart as String) = :weekStartStr)
        AND (:statusStr IS NULL OR cast(r.status as String) = :statusStr)
        ORDER BY r.weekStart DESC, r.createdAt DESC
        """)
    List<WeeklyAdminReview> findWithFilters(
            @Param("storeId") UUID storeId,
            @Param("staffId") UUID staffId,
            @Param("weekStartStr") String weekStartStr,
            @Param("statusStr") String statusStr
    );
}