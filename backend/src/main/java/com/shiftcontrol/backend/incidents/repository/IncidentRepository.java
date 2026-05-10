package com.shiftcontrol.backend.incidents.repository;

import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

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
}