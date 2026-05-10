package com.shiftcontrol.backend.incidents.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolveIncidentRequest(

        @NotBlank
        @Size(max = 1000)
        String resolutionNote
) {
}