package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthorizationIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: STAFF cannot create a store
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_create_store() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);
        String uniqueName = "New Store " + UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(post("/api/stores")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "address": "Test Address",
                                  "baseCashAmount": 103.00
                                }
                                """.formatted(uniqueName)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 2: ADMIN can create a store
    // -------------------------------------------------------------------------

    @Test
    void admin_can_create_store() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);
        String uniqueName = "Admin Store " + UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(post("/api/stores")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "address": "Admin Address",
                                  "baseCashAmount": 103.00
                                }
                                """.formatted(uniqueName)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Store created successfully"))
                .andExpect(jsonPath("$.data.name").value(uniqueName));
    }

    // -------------------------------------------------------------------------
    // Test 3: STAFF cannot access another staff member's sale
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_access_other_staff_sale() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);
        Sale sale = createSale(store, staffA, shiftA, SaleStatus.ACTIVE, Instant.now());

        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/sales/{id}", sale.getId())
                        .header("Authorization", "Bearer " + staffBToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this sale"));
    }

    // -------------------------------------------------------------------------
    // Test 4: STAFF cannot access another staff member's shift
    // -------------------------------------------------------------------------

    @Test
    void staff_cannot_access_other_staff_shift() throws Exception {
        // Arrange
        Store store = createStore();
        User staffA = createStaff(store);
        User staffB = createStaff(store);
        Shift shiftA = createOpenShift(staffA, store);

        String staffBToken = jwtService.generateAccessToken(staffB);

        // Act + Assert
        mockMvc.perform(get("/api/shifts/{id}", shiftA.getId())
                        .header("Authorization", "Bearer " + staffBToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not allowed to access this shift"));
    }

}
