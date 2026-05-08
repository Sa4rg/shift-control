package com.shiftcontrol.backend.closures.repository;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.shifts.model.Shift;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

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
}