package com.shiftcontrol.backend.shifts.repository;

import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.users.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftRepository extends JpaRepository<Shift, UUID>, JpaSpecificationExecutor<Shift> {

    boolean existsByStaffAndStatus(User staff, ShiftStatus status);

    @Query("SELECT s FROM Shift s JOIN FETCH s.staff JOIN FETCH s.store WHERE s.staff = :staff AND s.status = :status")
    Optional<Shift> findByStaffAndStatus(@Param("staff") User staff, @Param("status") ShiftStatus status);

    @Query("""
    SELECT s FROM Shift s
    JOIN FETCH s.staff
    JOIN FETCH s.store
    LEFT JOIN FETCH s.closedBy
    WHERE s.id = :id
    """)
    Optional<Shift> findByIdWithDetails(@Param("id") UUID id);

    @Query("""
    SELECT s FROM Shift s
    JOIN FETCH s.staff
    JOIN FETCH s.store
    LEFT JOIN FETCH s.closedBy
    ORDER BY s.openedAt DESC
    """)
    List<Shift> findAllWithDetails();

    @Query("""
        SELECT s FROM Shift s
        JOIN FETCH s.staff
        JOIN FETCH s.store
        LEFT JOIN FETCH s.closedBy
        WHERE s.staff.id = :staffId
        ORDER BY s.openedAt DESC
    """)
    List<Shift> findByStaffIdWithDetails(@Param("staffId") UUID staffId);

    @Query("""
        SELECT s FROM Shift s
        JOIN FETCH s.staff
        JOIN FETCH s.store
        LEFT JOIN FETCH s.closedBy
        WHERE s.id IN :ids
        ORDER BY s.openedAt DESC
    """)
    List<Shift> findAllWithDetailsByIds(@Param("ids") List<UUID> ids);
}