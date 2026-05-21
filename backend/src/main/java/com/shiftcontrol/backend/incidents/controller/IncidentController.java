package com.shiftcontrol.backend.incidents.controller;

import com.shiftcontrol.backend.incidents.dto.CreateIncidentRequest;
import com.shiftcontrol.backend.incidents.dto.IncidentResponse;
import com.shiftcontrol.backend.incidents.dto.ResolveIncidentRequest;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.service.IncidentService;
import com.shiftcontrol.backend.shared.response.ApiResponse;
import com.shiftcontrol.backend.users.model.Role;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<IncidentResponse> createIncident(
            Authentication authentication,
            @Valid @RequestBody CreateIncidentRequest request
    ) {
        UUID reportedByUserId = UUID.fromString(authentication.getName());

        IncidentResponse response = IncidentResponse.fromEntity(
                incidentService.createIncident(reportedByUserId, request)
        );

        return ApiResponse.ok("Incident created successfully", response);
    }

    @GetMapping
    public ApiResponse<List<IncidentResponse>> listIncidents(
            Authentication authentication,
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) UUID storeId,
            @RequestParam(required = false) UUID staffId,
            @RequestParam(required = false) UUID shiftId,
            @RequestParam(required = false) UUID closureId,
            @RequestParam(required = false) UUID saleId
    ) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());
        Role authenticatedRole = extractRole(authentication);

        List<IncidentResponse> response = incidentService
                .listIncidents(status, authenticatedUserId, authenticatedRole, storeId, staffId, shiftId, closureId, saleId)
                .stream()
                .map(IncidentResponse::fromEntity)
                .toList();

        return ApiResponse.ok("Incidents retrieved successfully", response);
    }

    @GetMapping("/{id}")
    public ApiResponse<IncidentResponse> getById(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());
        Role authenticatedRole = extractRole(authentication);

        IncidentResponse response = IncidentResponse.fromEntity(
                incidentService.getById(id, authenticatedUserId, authenticatedRole)
        );

        return ApiResponse.ok("Incident retrieved successfully", response);
    }

    @PatchMapping("/{id}/resolve")
    public ApiResponse<IncidentResponse> resolveIncident(
            @PathVariable UUID id,
            Authentication authentication,
            @Valid @RequestBody ResolveIncidentRequest request
    ) {
        UUID resolvedByUserId = UUID.fromString(authentication.getName());

        IncidentResponse response = IncidentResponse.fromEntity(
                incidentService.resolveIncident(id, resolvedByUserId, request)
        );

        return ApiResponse.ok("Incident resolved successfully", response);
    }

    private Role extractRole(Authentication authentication) {
        String authority = authentication.getAuthorities()
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Authenticated user has no role"))
                .getAuthority();

        return Role.valueOf(authority.replace("ROLE_", ""));
    }
}