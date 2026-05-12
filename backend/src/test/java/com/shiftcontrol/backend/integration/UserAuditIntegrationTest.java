package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.shared.security.JwtService;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserAuditIntegrationTest extends IntegrationTestBase {

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

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

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store createStore() {
        Instant now = Instant.now();
        Store store = new Store();
        store.setName("User Audit Store " + UUID.randomUUID());
        store.setAddress("Audit Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(now);
        store.setUpdatedAt(now);
        return storeRepository.save(store);
    }

    private User createAdmin() {
        Instant now = Instant.now();
        User admin = new User();
        admin.setFullName("User Audit Admin");
        admin.setUsername("user.audit.admin." + UUID.randomUUID());
        admin.setEmail(null);
        admin.setPinHash(null);
        admin.setPasswordHash("hashed-password");
        admin.setRole(Role.ADMIN);
        admin.setStore(null);
        admin.setActive(true);
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        return userRepository.save(admin);
    }

    private User createStaff(Store store) {
        Instant now = Instant.now();
        User staff = new User();
        staff.setFullName("User Audit Staff");
        staff.setUsername("user.audit.staff." + UUID.randomUUID());
        staff.setEmail(null);
        staff.setPinHash("hashed-pin");
        staff.setPasswordHash(null);
        staff.setRole(Role.STAFF);
        staff.setStore(store);
        staff.setActive(true);
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);
        return userRepository.save(staff);
    }
}
