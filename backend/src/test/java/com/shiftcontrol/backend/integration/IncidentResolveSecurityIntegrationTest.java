package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Security tests for PATCH /api/incidents/{id}/resolve.
 *
 * Validates that the URL-level ADMIN rule in SecurityConfig and the service-level
 * check in IncidentService both enforce the ADMIN requirement independently
 * (defense-in-depth).
 */
class IncidentResolveSecurityIntegrationTest extends IntegrationTestBase {

    private static final String RESOLVE_BODY = """
            {
              "resolutionNote": "Issue investigated and resolved."
            }
            """;

    // -------------------------------------------------------------------------
    // Test 1: unauthenticated request returns 401
    // -------------------------------------------------------------------------

    @Test
    void unauthenticated_patch_resolve_returns_401() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Incident incident = createOpenIncident(staff, shift);

        mockMvc.perform(patch("/api/incidents/{id}/resolve", incident.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(RESOLVE_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -------------------------------------------------------------------------
    // Test 2: STAFF token returns 403 (blocked at URL level before service)
    // -------------------------------------------------------------------------

    @Test
    void staff_patch_resolve_returns_403() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Incident incident = createOpenIncident(staff, shift);
        String staffToken = jwtService.generateAccessToken(staff);

        mockMvc.perform(patch("/api/incidents/{id}/resolve", incident.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(RESOLVE_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -------------------------------------------------------------------------
    // Test 3: ADMIN token can resolve incident successfully
    // -------------------------------------------------------------------------

    @Test
    void admin_can_resolve_open_incident() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Incident incident = createOpenIncident(staff, shift);

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(patch("/api/incidents/{id}/resolve", incident.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(RESOLVE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.resolvedById").value(admin.getId().toString()))
                .andExpect(jsonPath("$.data.resolutionNote").value("Issue investigated and resolved."));
    }

    // -------------------------------------------------------------------------
    // Test 4: ADMIN cannot resolve an already-resolved incident
    // -------------------------------------------------------------------------

    @Test
    void admin_cannot_resolve_already_resolved_incident() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Incident incident = createResolvedIncident(staff, shift);

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(patch("/api/incidents/{id}/resolve", incident.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(RESOLVE_BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -------------------------------------------------------------------------
    // Test 5: STAFF cannot read another staff member's incident
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_get_another_staffs_incident() throws Exception {
        Store store = createStore();

        User ownerStaff = createStaff(store, "Owner Staff");
        Shift ownerShift = createOpenShift(ownerStaff, store);
        Incident incident = createOpenIncident(ownerStaff, ownerShift);

        User otherStaff = createStaff(store, "Other Staff");
        String otherToken = jwtService.generateAccessToken(otherStaff);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/incidents/{id}", incident.getId())
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isBadRequest()) // service throws BusinessException → 400
                .andExpect(jsonPath("$.success").value(false));
    }

    // -------------------------------------------------------------------------
    // Test 6: STAFF cannot create an incident for another staff's shift
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_create_incident_for_another_staffs_shift() throws Exception {
        Store store = createStore();

        User ownerStaff = createStaff(store, "Owner Staff");
        Shift ownerShift = createOpenShift(ownerStaff, store);

        User otherStaff = createStaff(store, "Other Staff");
        String otherToken = jwtService.generateAccessToken(otherStaff);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/incidents")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "shiftId": "%s",
                                  "closureId": null,
                                  "saleId": null,
                                  "type": "OPERATIONAL_NOTE",
                                  "severity": "LOW",
                                  "title": "Unauthorized incident",
                                  "description": "This should be rejected."
                                }
                                """.formatted(ownerShift.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Incident createOpenIncident(User reportedBy, Shift shift) {
        return createIncident(reportedBy, shift, IncidentStatus.OPEN, Instant.now());
    }

    private Incident createResolvedIncident(User reportedBy, Shift shift) {
        return createIncident(reportedBy, shift, IncidentStatus.RESOLVED, Instant.now());
    }
}
