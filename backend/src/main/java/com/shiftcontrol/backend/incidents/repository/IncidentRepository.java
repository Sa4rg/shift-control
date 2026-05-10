package com.shiftcontrol.backend.incidents.repository;

import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    @EntityGraph(attributePaths = {
            "shift",
            "closure",
            "sale",
            "reportedBy",
            "resolvedBy"
    })
    Optional<Incident> findWithDetailsById(UUID id);

    @EntityGraph(attributePaths = {
            "shift",
            "closure",
            "sale",
            "reportedBy",
            "resolvedBy"
    })
    List<Incident> findByStatusOrderByCreatedAtDesc(IncidentStatus status);

    @EntityGraph(attributePaths = {
            "shift",
            "closure",
            "sale",
            "reportedBy",
            "resolvedBy"
    })
    List<Incident> findAllByOrderByCreatedAtDesc();

    @Query("""
        SELECT i FROM Incident i
        LEFT JOIN FETCH i.shift directShift
        LEFT JOIN FETCH directShift.staff
        LEFT JOIN FETCH directShift.store
        LEFT JOIN FETCH i.closure closure
        LEFT JOIN FETCH closure.shift closureShift
        LEFT JOIN FETCH closureShift.staff
        LEFT JOIN FETCH closureShift.store
        LEFT JOIN FETCH i.sale sale
        LEFT JOIN FETCH sale.shift saleShift
        LEFT JOIN FETCH saleShift.staff
        LEFT JOIN FETCH saleShift.store
        LEFT JOIN FETCH i.reportedBy
        LEFT JOIN FETCH i.resolvedBy
        WHERE i.createdAt >= :from
        AND i.createdAt < :to
        AND (
                directShift.store.id = :storeId
            OR closureShift.store.id = :storeId
            OR saleShift.store.id = :storeId
        )
        ORDER BY i.createdAt DESC
    """)
    List<Incident> findWeeklyIncidentsWithContext(
            @Param("storeId") UUID storeId,
            @Param("from") Instant from,
            @Param("to") Instant to
    );
}