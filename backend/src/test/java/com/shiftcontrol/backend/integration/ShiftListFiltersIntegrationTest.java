package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ShiftListFiltersIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: no filters preserve existing behavior — admin sees all shifts
    // -------------------------------------------------------------------------

    @Test
    void no_filters_preserve_existing_behavior_for_admin() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);
        createOpenShift(staff, store);
        createClosedShift(staff, store, admin, Instant.now());

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/shifts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    // -------------------------------------------------------------------------
    // Test 2: admin can filter shifts by store
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_shifts_by_store() throws Exception {
        Store storeA = createStore();
        Store storeB = createStore();
        User admin = createAdmin();
        User staffA = createStaff(storeA);
        User staffB = createStaff(storeB);
        createOpenShift(staffA, storeA);
        createOpenShift(staffB, storeB);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/shifts")
                        .param("storeId", storeA.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].storeId",
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(storeA.getId().toString()))));
    }

    // -------------------------------------------------------------------------
    // Test 3: admin can filter shifts by staffId
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_shifts_by_staff() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        createOpenShift(staffA, store);
        createOpenShift(staffB, store);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/shifts")
                        .param("staffId", staffA.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].staffId",
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(staffA.getId().toString()))));
    }

    // -------------------------------------------------------------------------
    // Test 4: admin can filter shifts by status
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_shifts_by_status() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);
        createOpenShift(staff, store);
        createClosedShift(staff, store, admin, Instant.now());

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/shifts")
                        .param("status", "OPEN")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].status",
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("OPEN"))));
    }

    // -------------------------------------------------------------------------
    // Test 5: admin can filter shifts by date range
    // -------------------------------------------------------------------------

    @Test
    void admin_can_filter_shifts_by_date_range() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);
        createClosedShift(staff, store, admin, Instant.parse("2025-01-15T10:00:00Z"));
        createClosedShift(staff, store, admin, Instant.parse("2025-06-15T10:00:00Z"));

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/shifts")
                        .param("from", "2025-01-01")
                        .param("to", "2025-03-31")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", hasSize(1)));
    }

    // -------------------------------------------------------------------------
    // Test 6: admin can combine multiple filters
    // -------------------------------------------------------------------------

    @Test
    void admin_can_combine_shift_filters() throws Exception {
        Store storeA = createStore();
        Store storeB = createStore();
        User admin = createAdmin();
        User staffA = createStaff(storeA);
        User staffB = createStaff(storeB);
        createOpenShift(staffA, storeA);
        createOpenShift(staffB, storeB);

        String adminToken = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/api/shifts")
                        .param("storeId", storeA.getId().toString())
                        .param("status", "OPEN")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].storeId",
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(storeA.getId().toString()))));
    }

    // -------------------------------------------------------------------------
    // Test 7: staff can filter own shifts by status
    // -------------------------------------------------------------------------

    @Test
    void staff_can_filter_own_shifts_by_status() throws Exception {
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store);
        createOpenShift(staff, store);
        createClosedShift(staff, store, admin, Instant.now());

        String staffToken = jwtService.generateAccessToken(staff);

        mockMvc.perform(get("/api/shifts")
                        .param("status", "CLOSED")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].status",
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("CLOSED"))));
    }

    // -------------------------------------------------------------------------
    // Test 8: staff cannot see other staff shifts even with staffId filter
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_see_other_staff_shifts_even_with_staffId_filter() throws Exception {
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        createOpenShift(staffB, store);

        String staffAToken = jwtService.generateAccessToken(staffA);

        mockMvc.perform(get("/api/shifts")
                        .param("staffId", staffB.getId().toString())
                        .header("Authorization", "Bearer " + staffAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].staffId",
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem(staffB.getId().toString()))));
    }
}
