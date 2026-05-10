package com.shiftcontrol.backend.closures.repository;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.shifts.model.Shift;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftClosureRepository extends JpaRepository<ShiftClosure, UUID> {

    boolean existsByShift(Shift shift);

    Optional<ShiftClosure> findByShift(Shift shift);

    @EntityGraph(attributePaths = {
            "shift",
            "shift.staff",
            "shift.store",
            "closedBy"
    })
    Optional<ShiftClosure> findWithDetailsById(UUID id);

    @EntityGraph(attributePaths = {
            "shift",
            "shift.staff",
            "shift.store",
            "closedBy"
    })
    Optional<ShiftClosure> findWithDetailsByShiftId(UUID shiftId);

    @Query("""
        SELECT c FROM ShiftClosure c
        JOIN FETCH c.shift s
        JOIN FETCH s.staff
        JOIN FETCH s.store
        JOIN FETCH c.closedBy
        WHERE s.store.id = :storeId
        AND s.closedAt >= :from
        AND s.closedAt < :to
        ORDER BY s.staff.fullName ASC, s.closedAt ASC
        """)
        List<ShiftClosure> findWeeklyClosuresWithDetails(
                @Param("storeId") UUID storeId,
                @Param("from") Instant from,
                @Param("to") Instant to
        );
}