package com.shiftcontrol.backend.reviews.repository;

import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
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
}