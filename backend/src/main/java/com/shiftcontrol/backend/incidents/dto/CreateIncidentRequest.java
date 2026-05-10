package com.shiftcontrol.backend.incidents.dto;

import com.shiftcontrol.backend.incidents.model.IncidentSeverity;
import com.shiftcontrol.backend.incidents.model.IncidentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateIncidentRequest(

        UUID shiftId,

        UUID closureId,

        UUID saleId,

        @NotNull
        IncidentType type,

        @NotNull
        IncidentSeverity severity,

        @NotBlank
        @Size(max = 160)
        String title,

        @NotBlank
        @Size(max = 1000)
        String description
) {
}