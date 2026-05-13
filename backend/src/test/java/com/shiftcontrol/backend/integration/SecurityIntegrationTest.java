package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityIntegrationTest extends IntegrationTestBase {

    @Autowired
    private PasswordEncoder passwordEncoder;

    // -------------------------------------------------------------------------
    // Test 1: request without Authorization header returns 401
    // -------------------------------------------------------------------------

    @Test
    void should_return_401_when_request_has_no_token() throws Exception {
        // Arrange — no token needed

        // Act + Assert
        mockMvc.perform(get("/api/shifts/current"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    // -------------------------------------------------------------------------
    // Test 2: invalid JWT token returns 401
    // -------------------------------------------------------------------------

    @Test
    void should_return_401_when_token_is_invalid() throws Exception {
        // Arrange — deliberately malformed token

        // Act + Assert
        mockMvc.perform(get("/api/shifts/current")
                        .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    // -------------------------------------------------------------------------
    // Test 3: STAFF token on admin endpoint returns 403
    // -------------------------------------------------------------------------

    @Test
    void should_return_403_when_staff_accesses_admin_endpoint() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaffWithUsername(store, "sec.staff." + UUID.randomUUID(), passwordEncoder.encode("123456"));
        String staffToken = jwtService.generateAccessToken(staff);
        UUID randomStoreId = UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/monthly")
                        .param("storeId", randomStoreId.toString())
                        .param("month", "2026-05")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 4: ADMIN token on admin endpoint returns 200
    // -------------------------------------------------------------------------

    @Test
    void should_allow_admin_to_access_admin_endpoint() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdminWithUsername("test.admin." + UUID.randomUUID(), passwordEncoder.encode("adminpass"));
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/monthly")
                        .param("storeId", store.getId().toString())
                        .param("month", "2026-05")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Monthly report retrieved successfully"));
    }

    // -------------------------------------------------------------------------
    // Test 5: wrong PIN returns generic error for STAFF login
    // -------------------------------------------------------------------------

    @Test
    void should_return_generic_error_for_invalid_staff_login() throws Exception {
        // Arrange
        Store store = createStore();
        String username = "sec.staff." + UUID.randomUUID();
        createStaffWithUsername(store, username, passwordEncoder.encode("123456"));

        // Act + Assert — send a wrong but format-valid 6-digit PIN
        mockMvc.perform(post("/api/auth/staff/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "pin": "999999"
                                }
                                """.formatted(username)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    // -------------------------------------------------------------------------
    // Test 6: wrong password returns generic error for ADMIN login
    // -------------------------------------------------------------------------

    @Test
    void should_return_generic_error_for_invalid_admin_login() throws Exception {
        // Arrange
        String username = "sec.admin." + UUID.randomUUID();
        createAdminWithUsername(username, passwordEncoder.encode("correctpass"));

        // Act + Assert
        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "wrongpass"
                                }
                                """.formatted(username)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    // -------------------------------------------------------------------------
    // Test 7: inactive STAFF with correct PIN returns generic error
    // -------------------------------------------------------------------------

    @Test
    void should_reject_login_for_inactive_staff() throws Exception {
        // Arrange
        Store store = createStore();
        String username = "sec.inactive.staff." + UUID.randomUUID();
        createInactiveStaffWithUsername(store, username, passwordEncoder.encode("123456"));

        // Act + Assert — correct PIN but user is inactive
        mockMvc.perform(post("/api/auth/staff/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "pin": "123456"
                                }
                                """.formatted(username)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    // -------------------------------------------------------------------------
    // Test 8: inactive ADMIN with correct password returns generic error
    // -------------------------------------------------------------------------

    @Test
    void should_reject_login_for_inactive_admin() throws Exception {
        // Arrange
        String username = "sec.inactive.admin." + UUID.randomUUID();
        createInactiveAdminWithUsername(username, passwordEncoder.encode("correctpass"));

        // Act + Assert — correct password but user is inactive
        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "correctpass"
                                }
                                """.formatted(username)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    // -------------------------------------------------------------------------
    // Test 9: GET /api/auth/me returns current STAFF user
    // -------------------------------------------------------------------------

    @Test
    void should_return_current_staff_user() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaffWithUsername(store, "sec.me.staff." + UUID.randomUUID(),
                passwordEncoder.encode("123456"));
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
                .andExpect(jsonPath("$.data.pinHash").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Test 10: GET /api/auth/me returns current ADMIN user
    // -------------------------------------------------------------------------

    @Test
    void should_return_current_admin_user() throws Exception {
        // Arrange
        User admin = createAdminWithUsername("sec.me.admin." + UUID.randomUUID(),
                passwordEncoder.encode("adminpass"));
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Current user retrieved successfully"))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.storeId").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 11: GET /api/auth/me without token returns 401
    // -------------------------------------------------------------------------

    @Test
    void should_reject_auth_me_without_token() throws Exception {
        // Arrange — no token

        // Act + Assert
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    // -------------------------------------------------------------------------
    // Test 12: GET /api/auth/me with inactive user returns 400
    // -------------------------------------------------------------------------

    @Test
    void should_reject_auth_me_for_inactive_user() throws Exception {
        // Arrange
        Store store = createStore();
        User inactiveStaff = createInactiveStaffWithUsername(store, "sec.me.inactive." + UUID.randomUUID(),
                passwordEncoder.encode("123456"));
        String token = jwtService.generateAccessToken(inactiveStaff);

        // Act + Assert
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("User is inactive"));
    }

    // -------------------------------------------------------------------------
    // Test 13: expired JWT token returns 401
    //
    // The JwtAuthenticationFilter catches ExpiredJwtException, clears the
    // security context and continues the filter chain. Spring Security's
    // AuthenticationEntryPoint then returns 401 "Unauthorized".
    // -------------------------------------------------------------------------

    @Test
    void should_return_401_when_token_is_expired() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);

        // Build an expired JWT manually using the same test secret.
        // issuedAt = 2 hours ago, expiration = 1 hour ago.
        SecretKey key = Keys.hmacShaKeyFor(
                "test-jwt-secret-must-be-at-least-32-bytes-long"
                        .getBytes(StandardCharsets.UTF_8));
        Instant issuedAt = Instant.now().minusSeconds(7200);
        Instant expiredAt = issuedAt.plusSeconds(3600); // still in the past

        String expiredToken = Jwts.builder()
                .subject(staff.getId().toString())
                .claim("username", staff.getUsername())
                .claim("role", staff.getRole().name())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiredAt))
                .signWith(key)
                .compact();

        // Act + Assert
        mockMvc.perform(get("/api/shifts/current")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

}
