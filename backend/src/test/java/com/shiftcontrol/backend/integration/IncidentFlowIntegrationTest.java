package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentSeverity;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.model.IncidentType;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class IncidentFlowIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: staff can create an incident for their own shift
    // -------------------------------------------------------------------------

    @Test
    void should_create_incident_as_staff_for_own_shift() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(post("/api/incidents")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "shiftId": "%s",
                                  "closureId": null,
                                  "saleId": null,
                                  "type": "OPERATIONAL_NOTE",
                                  "severity": "LOW",
                                  "title": "Note from shift",
                                  "description": "Customer asked for receipt copy."
                                }
                                """.formatted(shift.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incident created successfully"))
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.type").value("OPERATIONAL_NOTE"))
                .andExpect(jsonPath("$.data.severity").value("LOW"))
                .andExpect(jsonPath("$.data.title").value("Note from shift"))
                .andExpect(jsonPath("$.data.description").value("Customer asked for receipt copy."))
                .andExpect(jsonPath("$.data.shiftId").value(shift.getId().toString()))
                .andExpect(jsonPath("$.data.reportedById").value(staff.getId().toString()));
    }

    // -------------------------------------------------------------------------
    // Test 2: admin can list open incidents
    // -------------------------------------------------------------------------

    @Test
    void should_list_open_incidents_as_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createOpenIncident(staff, shift);

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/incidents")
                        .param("status", "OPEN")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incidents retrieved successfully"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].status").value("OPEN"));
    }

    // -------------------------------------------------------------------------
    // Test 3: staff can list their own incidents (empty when none exist)
    // -------------------------------------------------------------------------

    @Test
    void should_list_empty_incidents_for_staff_with_no_incidents() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/incidents")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incidents retrieved successfully"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 3b: staff can list their own incidents when they exist
    // -------------------------------------------------------------------------

    @Test
    void should_list_own_incidents_as_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Incident incident = createOpenIncident(staff, shift);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/incidents")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.id == '" + incident.getId() + "')]").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 3c: staff cannot see incidents from another staff member
    // -------------------------------------------------------------------------

    @Test
    void should_not_list_other_staff_incidents_as_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);
        Incident incidentA = createOpenIncident(staffA, shiftA);

        User staffB = createStaff(store);
        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/incidents")
                        .header("Authorization", "Bearer " + staffBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentA.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 3d: unauthenticated users get 401
    // -------------------------------------------------------------------------

    @Test
    void should_return_401_when_unauthenticated_lists_incidents() throws Exception {
        mockMvc.perform(get("/api/incidents"))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // Test 3e: admin can list incidents from all staff members
    // -------------------------------------------------------------------------

    @Test
    void should_list_all_incidents_as_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);
        Incident incidentA = createOpenIncident(staffA, shiftA);

        User staffB = createStaff(store);
        Shift shiftB = createOpenShift(staffB, store);
        Incident incidentB = createOpenIncident(staffB, shiftB);

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/incidents")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentB.getId() + "')]").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 4: admin can resolve an open incident
    // -------------------------------------------------------------------------

    @Test
    void should_resolve_open_incident_as_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Incident incident = createOpenIncident(staff, shift);

        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(patch("/api/incidents/{id}/resolve", incident.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolutionNote": "Reviewed and resolved."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incident resolved successfully"))
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.resolutionNote").value("Reviewed and resolved."))
                .andExpect(jsonPath("$.data.resolvedById").value(admin.getId().toString()))
                .andExpect(jsonPath("$.data.resolvedAt").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 5: cannot resolve an already resolved incident
    // -------------------------------------------------------------------------

    @Test
    void should_reject_resolving_already_resolved_incident() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        User admin = createAdmin();
        Incident incident = createResolvedIncident(staff, admin);
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(patch("/api/incidents/{id}/resolve", incident.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolutionNote": "Trying again."
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Incident is already resolved"));
    }

    // -------------------------------------------------------------------------
    // Test 6: staff cannot create an incident for another staff's shift
    // -------------------------------------------------------------------------

    @Test
    void should_reject_staff_creating_incident_for_other_staff_shift() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);
        User staffB = createStaff(store);
        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(post("/api/incidents")
                        .header("Authorization", "Bearer " + staffBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "shiftId": "%s",
                                  "closureId": null,
                                  "saleId": null,
                                  "type": "OPERATIONAL_NOTE",
                                  "severity": "LOW",
                                  "title": "Access attempt",
                                  "description": "Staff B trying to report on Staff A shift."
                                }
                                """.formatted(shiftA.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this incident context"));
    }

    // -------------------------------------------------------------------------
    // Test 7: GET /api/incidents/{id} — admin retrieves an incident by id
    // -------------------------------------------------------------------------

    @Test
    void should_get_incident_by_id_as_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Incident incident = createOpenIncident(staff, shift);
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/incidents/{id}", incident.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incident retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(incident.getId().toString()))
                .andExpect(jsonPath("$.data.shiftId").value(shift.getId().toString()))
                .andExpect(jsonPath("$.data.reportedById").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.status").value("OPEN"));
    }

    // -------------------------------------------------------------------------
    // Test 8: GET /api/incidents?status=OPEN — OPEN appears, RESOLVED excluded
    // -------------------------------------------------------------------------

    @Test
    void should_list_open_incidents_with_status_filter() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        Incident openIncident = createOpenIncident(staff, shift);
        Incident resolvedIncident = createResolvedIncident(staff, admin);

        // Act + Assert
        mockMvc.perform(get("/api/incidents")
                        .param("status", "OPEN")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incidents retrieved successfully"))
                // OPEN incident is present
                .andExpect(jsonPath("$.data[?(@.id == '" + openIncident.getId() + "')]").isNotEmpty())
                // RESOLVED incident is absent from the OPEN filter
                .andExpect(jsonPath("$.data[?(@.id == '" + resolvedIncident.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Incident createOpenIncident(User reportedBy, Shift shift) {
        Instant now = Instant.now();

        Incident incident = new Incident();
        incident.setShift(shift);
        incident.setClosure(null);
        incident.setSale(null);
        incident.setReportedBy(reportedBy);
        incident.setResolvedBy(null);
        incident.setType(IncidentType.OPERATIONAL_NOTE);
        incident.setStatus(IncidentStatus.OPEN);
        incident.setSeverity(IncidentSeverity.LOW);
        incident.setTitle("Open incident");
        incident.setDescription("Test open incident");
        incident.setResolutionNote(null);
        incident.setCreatedAt(now);
        incident.setUpdatedAt(now);
        incident.setResolvedAt(null);

        return incidentRepository.save(incident);
    }

    private Incident createResolvedIncident(User reportedBy, User resolvedBy) {
        Instant now = Instant.now();

        Incident incident = new Incident();
        incident.setShift(null);
        incident.setClosure(null);
        incident.setSale(null);
        incident.setReportedBy(reportedBy);
        incident.setResolvedBy(resolvedBy);
        incident.setType(IncidentType.OTHER);
        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setSeverity(IncidentSeverity.LOW);
        incident.setTitle("Already resolved incident");
        incident.setDescription("This was already resolved.");
        incident.setResolutionNote("Previously resolved.");
        incident.setCreatedAt(now);
        incident.setUpdatedAt(now);
        incident.setResolvedAt(now);

        return incidentRepository.save(incident);
    }
}
