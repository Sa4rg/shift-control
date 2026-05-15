package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ShiftClosePreviewIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: GET /api/shifts/{id}/close-preview — owner staff gets preview
    // -------------------------------------------------------------------------

    @Test
    void should_return_close_preview_for_owner_staff() throws Exception {
        // Arrange
        Store store = createStore();                      // baseCashAmount = 103.00
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createActiveCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}/close-preview", shift.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift close preview retrieved successfully"))
                .andExpect(jsonPath("$.data.shiftId").value(shift.getId().toString()))
                .andExpect(jsonPath("$.data.staffId").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.totalCash").value(45.00))
                .andExpect(jsonPath("$.data.totalMb").value(0.00))
                .andExpect(jsonPath("$.data.totalGlovoOnline").value(0.00))
                .andExpect(jsonPath("$.data.totalGlovoCash").value(0.00))
                .andExpect(jsonPath("$.data.totalSales").value(45.00))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(45.00))
                .andExpect(jsonPath("$.data.cashToWithdraw").value(45.00))
                .andExpect(jsonPath("$.data.expectedPhysicalCash").value(148.00));

        // Verify shift is still OPEN (no side effects)
        Shift reloaded = shiftRepository.findById(shift.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(ShiftStatus.OPEN);

        // Verify no closure was created
        assertThat(shiftClosureRepository.existsByShift(shift)).isFalse();
    }

    // -------------------------------------------------------------------------
    // Test 2: GET /api/shifts/{id}/close-preview — other staff is rejected
    // -------------------------------------------------------------------------

    @Test
    void should_reject_close_preview_for_other_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);

        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}/close-preview", shiftA.getId())
                        .header("Authorization", "Bearer " + staffBToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this shift"));
    }

    // -------------------------------------------------------------------------
    // Test 3: GET /api/shifts/{id}/close-preview — closed shift is rejected
    // -------------------------------------------------------------------------

    @Test
    void should_reject_close_preview_for_closed_shift() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift closedShift = createClosedShift(staff, store, staff, Instant.now());

        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}/close-preview", closedShift.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Only open shifts can be previewed for closure"));
    }

    // -------------------------------------------------------------------------
    // Test 4: GET /api/shifts/{id}/close-preview — 404 when shift does not exist
    // -------------------------------------------------------------------------

    @Test
    void should_return_not_found_when_shift_does_not_exist() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);
        UUID randomId = UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}/close-preview", randomId)
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Shift not found"));
    }
}
