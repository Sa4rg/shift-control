package com.shiftcontrol.backend.incidents.dto;

import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentSeverity;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.model.IncidentType;

import java.time.Instant;
import java.util.UUID;

public record IncidentResponse(
        UUID id,

        UUID shiftId,
        UUID closureId,
        UUID saleId,

        UUID reportedById,
        String reportedByName,

        UUID resolvedById,
        String resolvedByName,

        IncidentType type,
        IncidentStatus status,
        IncidentSeverity severity,

        String title,
        String description,
        String resolutionNote,

        Instant createdAt,
        Instant updatedAt,
        Instant resolvedAt
) {
    public static IncidentResponse fromEntity(Incident incident) {
        return new IncidentResponse(
                incident.getId(),

                incident.getShift() != null ? incident.getShift().getId() : null,
                incident.getClosure() != null ? incident.getClosure().getId() : null,
                incident.getSale() != null ? incident.getSale().getId() : null,

                incident.getReportedBy().getId(),
                incident.getReportedBy().getFullName(),

                incident.getResolvedBy() != null ? incident.getResolvedBy().getId() : null,
                incident.getResolvedBy() != null ? incident.getResolvedBy().getFullName() : null,

                incident.getType(),
                incident.getStatus(),
                incident.getSeverity(),

                incident.getTitle(),
                incident.getDescription(),
                incident.getResolutionNote(),

                incident.getCreatedAt(),
                incident.getUpdatedAt(),
                incident.getResolvedAt()
        );
    }
}