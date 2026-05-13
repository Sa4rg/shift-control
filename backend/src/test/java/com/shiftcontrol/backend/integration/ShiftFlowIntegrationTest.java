package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ShiftFlowIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: POST /api/shifts/open — staff opens shift successfully
    // -------------------------------------------------------------------------

    @Test
    void should_open_shift_as_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(post("/api/shifts/open")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "DAY"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift opened successfully"))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.staffId").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.type").value("DAY"))
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.openedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.closedAt", nullValue()));
    }

    // -------------------------------------------------------------------------
    // Test 2: POST /api/shifts/open — rejected when staff already has open shift
    // -------------------------------------------------------------------------

    @Test
    void should_reject_opening_second_shift_for_same_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        createOpenShift(staff, store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(post("/api/shifts/open")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "DAY"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Staff already has an open shift"));
    }

    // -------------------------------------------------------------------------
    // Test 3: GET /api/shifts/current — staff retrieves own open shift
    // -------------------------------------------------------------------------

    @Test
    void should_return_current_shift_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift openShift = createOpenShift(staff, store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/current")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Current shift retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(openShift.getId().toString()))
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.staffId").value(staff.getId().toString()));
    }

    // -------------------------------------------------------------------------
    // Test 4: GET /api/shifts/{id} — owner staff retrieves their shift by id
    // -------------------------------------------------------------------------

    @Test
    void should_return_shift_by_id_for_owner_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift openShift = createOpenShift(staff, store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}", openShift.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(openShift.getId().toString()))
                .andExpect(jsonPath("$.data.staffId").value(staff.getId().toString()));
    }

    // -------------------------------------------------------------------------
    // Test 5: GET /api/shifts/{id} — other staff is rejected
    // -------------------------------------------------------------------------

    @Test
    void should_reject_shift_by_id_for_other_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift staffAShift = createOpenShift(staffA, store);
        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}", staffAShift.getId())
                        .header("Authorization", "Bearer " + staffBToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this shift"));
    }

    // -------------------------------------------------------------------------
    // Test 6: GET /api/shifts — staff sees only own shifts
    // -------------------------------------------------------------------------

    @Test
    void should_list_only_own_shifts_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift staffAShift = createOpenShift(staffA, store);
        Shift staffBShift = createOpenShift(staffB, store);
        String staffAToken = jwtService.generateAccessToken(staffA);

        // Act + Assert
        mockMvc.perform(get("/api/shifts")
                        .header("Authorization", "Bearer " + staffAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shifts retrieved successfully"))
                .andExpect(jsonPath("$.data[?(@.id == '" + staffAShift.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + staffBShift.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 7: GET /api/shifts — admin sees all shifts
    // -------------------------------------------------------------------------

    @Test
    void should_list_all_shifts_for_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift staffAShift = createOpenShift(staffA, store);
        Shift staffBShift = createOpenShift(staffB, store);
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/shifts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shifts retrieved successfully"))
                .andExpect(jsonPath("$.data[?(@.id == '" + staffAShift.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + staffBShift.getId() + "')]").isNotEmpty());
    }
}
