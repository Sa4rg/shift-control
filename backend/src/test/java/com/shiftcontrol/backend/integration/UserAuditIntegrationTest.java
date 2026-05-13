package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserAuditIntegrationTest extends IntegrationTestBase {

    // -------------------------------------------------------------------------
    // Test 1: ADMIN deactivation sets audit fields
    // -------------------------------------------------------------------------

    @Test
    void should_return_deactivated_by_when_admin_deactivates_user() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createStore();
        User staff = createStaff(store);
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert — HTTP response
        mockMvc.perform(patch("/api/admin/users/{id}/deactivate", staff.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User deactivated successfully"))
                .andExpect(jsonPath("$.data.id").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.deactivatedById").value(admin.getId().toString()))
                .andExpect(jsonPath("$.data.deactivatedByName").value(admin.getUsername()))
                .andExpect(jsonPath("$.data.deactivatedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.pinHash").doesNotExist());

        // Assert — persisted state (non-lazy fields; deactivatedBy is lazy)
        User saved = userRepository.findById(staff.getId()).orElseThrow();
        assertThat(saved.isActive()).isFalse();
        assertThat(saved.getDeactivatedAt()).isNotNull();
    }

    // -------------------------------------------------------------------------
    // Test 2: STAFF cannot deactivate a user
    // -------------------------------------------------------------------------

    @Test
    void should_reject_user_deactivation_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        User otherStaff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(patch("/api/admin/users/{id}/deactivate", otherStaff.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

}
