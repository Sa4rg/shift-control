package com.shiftcontrol.backend.sales.repository;

import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.shifts.model.Shift;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {

    @EntityGraph(attributePaths = {"shift", "staff", "store"})
    Optional<Sale> findWithDetailsById(UUID id);

    List<Sale> findByShiftOrderByCreatedAtDesc(Shift shift);
}