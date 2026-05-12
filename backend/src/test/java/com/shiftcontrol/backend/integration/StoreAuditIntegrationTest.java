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

class StoreAuditIntegrationTest extends IntegrationTestBase {

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
    void should_return_deactivated_by_when_admin_deactivates_store() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createActiveStore();
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
        Store store = createActiveStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(patch("/api/stores/{id}/deactivate", store.getId())
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store createActiveStore() {
        Instant now = Instant.now();
        Store store = new Store();
        store.setName("Audit Store " + UUID.randomUUID());
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
        admin.setFullName("Audit Admin");
        admin.setUsername("audit.admin." + UUID.randomUUID());
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
        staff.setFullName("Audit Staff");
        staff.setUsername("audit.staff." + UUID.randomUUID());
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
