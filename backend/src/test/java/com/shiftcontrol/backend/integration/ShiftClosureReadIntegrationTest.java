package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ShiftClosureReadIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: GET /api/closures/{id} — owner staff retrieves their closure
    // -------------------------------------------------------------------------

    @Test
    void should_get_closure_by_id_for_owner_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift closedShift = createClosedShift(staff, store, staff, Instant.now());
        ShiftClosure closure = createClosure(
                closedShift, staff,
                "45.00", "0.00", "0.00", "0.00",
                "45.00", "45.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK
        );
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/closures/{id}", closure.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Closure retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(closure.getId().toString()))
                .andExpect(jsonPath("$.data.shiftId").value(closedShift.getId().toString()))
                .andExpect(jsonPath("$.data.closedById").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.status").value("CLOSED_OK"))
                .andExpect(jsonPath("$.data.totalSales").value(45.00))
                .andExpect(jsonPath("$.data.totalCash").value(45.00))
                .andExpect(jsonPath("$.data.totalMb").value(0.00))
                .andExpect(jsonPath("$.data.totalGlovoOnline").value(0.00))
                .andExpect(jsonPath("$.data.totalGlovoCash").value(0.00))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(45.00))
                .andExpect(jsonPath("$.data.cashDifference").value(0.00))
                .andExpect(jsonPath("$.data.mbDifference").value(0.00));
    }

    // -------------------------------------------------------------------------
    // Test 2: GET /api/closures?shiftId= — owner staff retrieves closure by shift
    // -------------------------------------------------------------------------

    @Test
    void should_get_closure_by_shift_id_for_owner_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift closedShift = createClosedShift(staff, store, staff, Instant.now());
        ShiftClosure closure = createClosure(
                closedShift, staff,
                "30.00", "20.00", "0.00", "0.00",
                "50.00", "10.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK
        );
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/closures")
                        .param("shiftId", closedShift.getId().toString())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Closure retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(closure.getId().toString()))
                .andExpect(jsonPath("$.data.shiftId").value(closedShift.getId().toString()))
                .andExpect(jsonPath("$.data.closedById").value(staff.getId().toString()));
    }

    // -------------------------------------------------------------------------
    // Test 3: GET /api/closures/{id} — other staff is rejected
    // -------------------------------------------------------------------------

    @Test
    void should_reject_get_closure_by_id_for_other_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift closedShiftA = createClosedShift(staffA, store, staffA, Instant.now());
        ShiftClosure closureA = createClosure(
                closedShiftA, staffA,
                "10.00", "0.00", "0.00", "0.00",
                "10.00", "10.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK
        );
        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/closures/{id}", closureA.getId())
                        .header("Authorization", "Bearer " + staffBToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this closure"));
    }

    // -------------------------------------------------------------------------
    // Test 4: GET /api/closures/{id} — 404 when closure does not exist
    // -------------------------------------------------------------------------

    @Test
    void should_return_not_found_when_closure_does_not_exist() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);
        UUID randomId = UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(get("/api/closures/{id}", randomId)
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Closure not found"));
    }

    // -------------------------------------------------------------------------
    // Test 5: GET /api/closures — 400 when shiftId param is missing
    // -------------------------------------------------------------------------

    @Test
    void should_return_400_when_shift_id_param_is_missing() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/closures")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("shiftId is required"));
    }
}
