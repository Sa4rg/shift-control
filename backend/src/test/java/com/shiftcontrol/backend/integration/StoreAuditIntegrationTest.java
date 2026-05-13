package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StoreAuditIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: ADMIN deactivation sets audit fields
    // -------------------------------------------------------------------------

    @Test
    void should_return_deactivated_by_when_admin_deactivates_store() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createStore();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert — HTTP response
        mockMvc.perform(patch("/api/stores/{id}/deactivate", store.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Store deactivated successfully"))
                .andExpect(jsonPath("$.data.id").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.deactivatedById").value(admin.getId().toString()))
                .andExpect(jsonPath("$.data.deactivatedByName").value(admin.getUsername()))
                .andExpect(jsonPath("$.data.deactivatedAt").isNotEmpty());

        // Assert — persisted state (non-lazy fields only; deactivatedBy is lazy)
        Store saved = storeRepository.findById(store.getId()).orElseThrow();
        assertThat(saved.isActive()).isFalse();
        assertThat(saved.getDeactivatedAt()).isNotNull();
    }

    // -------------------------------------------------------------------------
    // Test 2: STAFF cannot deactivate a store
    // -------------------------------------------------------------------------

    @Test
    void should_reject_store_deactivation_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(patch("/api/stores/{id}/deactivate", store.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

}
