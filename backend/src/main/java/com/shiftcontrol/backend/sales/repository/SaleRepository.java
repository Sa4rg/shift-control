package com.shiftcontrol.backend.sales.repository;

import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.shifts.model.Shift;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {

    @EntityGraph(attributePaths = {"shift", "staff", "store", "cancelledBy"})
    Optional<Sale> findWithDetailsById(UUID id);

    List<Sale> findByShiftOrderByCreatedAtDesc(Shift shift);

    List<Sale> findByShiftAndStatus(Shift shift, SaleStatus status);

    @Query("""
        SELECT COUNT(s) FROM Sale s
        WHERE s.store.id = :storeId
        AND s.createdAt >= :from
        AND s.createdAt < :to
        AND s.status = :status
    """)
    long countByStoreAndCreatedAtBetweenAndStatus(
            @Param("storeId") UUID storeId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("status") SaleStatus status
    );
}