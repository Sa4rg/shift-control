package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentSeverity;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.model.IncidentType;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class IncidentListFiltersIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: existing admin-all-incidents behavior still works (no filters)
    // -------------------------------------------------------------------------

    @Test
    void existing_admin_all_incidents_behavior_still_works() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        User admin = createAdmin();
        Shift shift = createOpenShift(staff, store);
        createOpenIncidentForShift(staff, shift);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/incidents")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    // -------------------------------------------------------------------------
    // Test 2: existing staff own-incidents behavior still works (no filters)
    // -------------------------------------------------------------------------

    @Test
    void existing_staff_own_incidents_behavior_still_works() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        User otherStaff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Shift otherShift = createOpenShift(otherStaff, store);
        Incident myIncident = createOpenIncidentForShift(staff, shift);
        createOpenIncidentForShift(otherStaff, otherShift);

        String staffToken = jwtService.generateAccessToken(staff);

        mockMvc.perform(get("/api/incidents")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + myIncident.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.reportedById == '" + otherStaff.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 3: admin can filter incidents by status
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_incidents_by_status() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        User admin = createAdmin();
        Shift shift = createOpenShift(staff, store);
        Incident openIncident = createOpenIncidentForShift(staff, shift);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/incidents")
                        .param("status", "OPEN")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[?(@.id == '" + openIncident.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[*].status",
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("OPEN"))));
    }

    // -------------------------------------------------------------------------
    // Test 4: admin can filter incidents by staffId
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_incidents_by_staff() throws Exception {
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        User admin = createAdmin();
        Shift shiftA = createOpenShift(staffA, store);
        Shift shiftB = createOpenShift(staffB, store);
        Incident incidentA = createOpenIncidentForShift(staffA, shiftA);
        createOpenIncidentForShift(staffB, shiftB);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/incidents")
                        .param("staffId", staffA.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.reportedById == '" + staffB.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 5: admin can filter incidents by shiftId
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_incidents_by_shift() throws Exception {
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        User admin = createAdmin();
        Shift shiftA = createOpenShift(staffA, store);
        Shift shiftB = createOpenShift(staffB, store);
        Incident incidentA = createOpenIncidentForShift(staffA, shiftA);
        Incident incidentB = createOpenIncidentForShift(staffB, shiftB);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/incidents")
                        .param("shiftId", shiftA.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentB.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 6: admin can combine incident filters
    // -------------------------------------------------------------------------

    @Test
    void admin_can_combine_incident_filters() throws Exception {
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        User admin = createAdmin();
        Shift shiftA = createOpenShift(staffA, store);
        Shift shiftB = createOpenShift(staffB, store);
        Incident incidentA = createOpenIncidentForShift(staffA, shiftA);
        createOpenIncidentForShift(staffB, shiftB);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/incidents")
                        .param("staffId", staffA.getId().toString())
                        .param("status", "OPEN")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.reportedById == '" + staffB.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 7: staff can filter own incidents by status
    // -------------------------------------------------------------------------

    @Test
    void staff_can_filter_own_incidents_by_status() throws Exception {
        Store store = createStore();
        User staff = createStaff(store);
        User admin = createAdmin();
        Shift shift = createOpenShift(staff, store);
        Incident openIncident = createOpenIncidentForShift(staff, shift);

        String staffToken = jwtService.generateAccessToken(staff);

        mockMvc.perform(get("/api/incidents")
                        .param("status", "OPEN")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + openIncident.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[*].status",
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("OPEN"))));
    }

    // -------------------------------------------------------------------------
    // Test 8: staff can filter own incidents by shiftId
    // -------------------------------------------------------------------------

    @Test
    void staff_can_filter_own_incidents_by_shift() throws Exception {
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);
        Shift shiftB = createOpenShift(staffB, store);
        Incident incidentA = createOpenIncidentForShift(staffA, shiftA);
        Incident incidentB = createOpenIncidentForShift(staffB, shiftB);

        String staffToken = jwtService.generateAccessToken(staffA);

        mockMvc.perform(get("/api/incidents")
                        .param("shiftId", shiftA.getId().toString())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentA.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentB.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 9: staff cannot see other staff incidents even with filter params
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_see_other_staff_incidents_with_filters() throws Exception {
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift shiftB = createOpenShift(staffB, store);
        Incident incidentB = createOpenIncidentForShift(staffB, shiftB);

        String staffAToken = jwtService.generateAccessToken(staffA);

        mockMvc.perform(get("/api/incidents")
                        .param("shiftId", shiftB.getId().toString())
                        .header("Authorization", "Bearer " + staffAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '" + incidentB.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Incident createOpenIncidentForShift(User reportedBy, Shift shift) {
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
        incident.setTitle("Filter test incident");
        incident.setDescription("Incident for filter tests.");
        incident.setResolutionNote(null);
        incident.setCreatedAt(now);
        incident.setUpdatedAt(now);
        incident.setResolvedAt(null);
        return incidentRepository.save(incident);
    }
}
