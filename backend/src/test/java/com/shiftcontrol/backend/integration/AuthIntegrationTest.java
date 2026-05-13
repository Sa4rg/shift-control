package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthIntegrationTest extends IntegrationTestBase {

    @Autowired
    private PasswordEncoder passwordEncoder;

    // -------------------------------------------------------------------------
    // Test 1: POST /api/auth/staff/login — successful login returns token + user
    // -------------------------------------------------------------------------

    @Test
    void should_login_staff_and_return_access_token() throws Exception {
        // Arrange
        Store store = createStore();
        String username = "auth.staff." + UUID.randomUUID();
        User staff = createStaffWithUsername(store, username, passwordEncoder.encode("123456"));

        // Act + Assert
        mockMvc.perform(post("/api/auth/staff/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "pin": "123456"
                                }
                                """.formatted(username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.id").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.user.username").value(username))
                .andExpect(jsonPath("$.data.user.role").value("STAFF"))
                .andExpect(jsonPath("$.data.user.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.user.pinHash").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Test 2: POST /api/auth/admin/login — successful login returns token + user
    // -------------------------------------------------------------------------

    @Test
    void should_login_admin_and_return_access_token() throws Exception {
        // Arrange
        String username = "auth.admin." + UUID.randomUUID();
        User admin = createAdminWithUsername(username, passwordEncoder.encode("StrongPassword123!"));

        // Act + Assert
        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "StrongPassword123!"
                                }
                                """.formatted(username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.id").value(admin.getId().toString()))
                .andExpect(jsonPath("$.data.user.username").value(username))
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.user.storeId").doesNotExist())
                .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.user.pinHash").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Test 3: GET /api/auth/me — returns current user from JWT
    // -------------------------------------------------------------------------

    @Test
    void should_return_current_user_with_auth_me() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Current user retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.username").value(staff.getUsername()))
                .andExpect(jsonPath("$.data.role").value("STAFF"))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.pinHash").doesNotExist());
    }
}
