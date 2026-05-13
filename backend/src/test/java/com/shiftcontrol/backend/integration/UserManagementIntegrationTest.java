package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserManagementIntegrationTest extends IntegrationTestBase {

    @Autowired
    private PasswordEncoder passwordEncoder;

    // -------------------------------------------------------------------------
    // Test 1: POST /api/admin/users/staff — admin creates a staff user
    // -------------------------------------------------------------------------

    @Test
    void should_create_staff_user_as_admin() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createStore();
        String adminToken = jwtService.generateAccessToken(admin);

        String uniqueUsername = "staff." + UUID.randomUUID();

        // Act + Assert — HTTP response
        String responseBody = mockMvc.perform(post("/api/admin/users/staff")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Integration Staff",
                                  "username": "%s",
                                  "pin": "123456",
                                  "storeId": "%s"
                                }
                                """.formatted(uniqueUsername, store.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Staff user created successfully"))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.username").value(uniqueUsername))
                .andExpect(jsonPath("$.data.fullName").value("Integration Staff"))
                .andExpect(jsonPath("$.data.role").value("STAFF"))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.deactivatedById").doesNotExist())
                .andExpect(jsonPath("$.data.deactivatedAt").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.pinHash").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        // Assert — persisted state: PIN is hashed, not plain text
        User saved = userRepository.findByUsernameIgnoreCase(uniqueUsername).orElseThrow();
        assertThat(saved.getPinHash()).isNotNull();
        assertThat(saved.getPinHash()).isNotEqualTo("123456");
    }

    // -------------------------------------------------------------------------
    // Test 2: POST /api/admin/users/admin — admin creates an admin user
    // -------------------------------------------------------------------------

    @Test
    void should_create_admin_user_as_admin() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        String uniqueUsername = "admin." + UUID.randomUUID();
        String uniqueEmail = "admin." + UUID.randomUUID() + "@test.com";

        // Act + Assert — HTTP response
        mockMvc.perform(post("/api/admin/users/admin")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Integration Admin",
                                  "username": "%s",
                                  "email": "%s",
                                  "password": "StrongPassword123!"
                                }
                                """.formatted(uniqueUsername, uniqueEmail)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Admin user created successfully"))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.username").value(uniqueUsername))
                .andExpect(jsonPath("$.data.fullName").value("Integration Admin"))
                .andExpect(jsonPath("$.data.email").value(uniqueEmail))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.storeId").doesNotExist())
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.pinHash").doesNotExist());

        // Assert — persisted state: password is hashed, not plain text
        User saved = userRepository.findByUsernameIgnoreCase(uniqueUsername).orElseThrow();
        assertThat(saved.getPasswordHash()).isNotNull();
        assertThat(saved.getPasswordHash()).isNotEqualTo("StrongPassword123!");
    }

    // -------------------------------------------------------------------------
    // Test 3: GET /api/admin/users — admin lists all users
    // -------------------------------------------------------------------------

    @Test
    void should_list_users_as_admin() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createStore();
        User staff = createStaff(store);
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Users retrieved successfully"))
                .andExpect(jsonPath("$.data[?(@.id == '" + admin.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + staff.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data[0].pinHash").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Test 4: GET /api/admin/users/{id} — admin retrieves a specific user
    // -------------------------------------------------------------------------

    @Test
    void should_get_user_by_id_as_admin() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createStore();
        User staff = createStaff(store);
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/users/{id}", staff.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.username").value(staff.getUsername()))
                .andExpect(jsonPath("$.data.role").value("STAFF"))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.pinHash").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Test 5: GET /api/admin/users?role=STAFF — filters by role
    // -------------------------------------------------------------------------

    @Test
    void should_filter_users_by_role_staff() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createStore();
        User staff = createStaff(store);
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert — staff appears; admin does NOT appear in the STAFF-filtered result
        mockMvc.perform(get("/api/admin/users")
                        .param("role", "STAFF")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.id == '" + staff.getId() + "')]").isNotEmpty())
                .andExpect(jsonPath("$.data[?(@.id == '" + admin.getId() + "')]").isEmpty());
    }

    // -------------------------------------------------------------------------
    // Test 6: GET /api/admin/users — staff cannot access user management
    // -------------------------------------------------------------------------

    @Test
    void should_reject_user_management_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 7: POST /api/admin/users/staff — invalid PIN format returns 400
    //
    // CreateStaffRequest enforces @Pattern(regexp = "\\d{6}") on pin.
    // A 4-digit PIN does not match → MethodArgumentNotValidException → 400.
    // -------------------------------------------------------------------------

    @Test
    void should_return_400_when_staff_pin_format_is_invalid() throws Exception {
        // Arrange
        User admin = createAdmin();
        Store store = createStore();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert — PIN "1234" is 4 digits, not 6
        mockMvc.perform(post("/api/admin/users/staff")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Bad Pin Staff",
                                  "username": "badpin.%s",
                                  "pin": "1234",
                                  "storeId": "%s"
                                }
                                """.formatted(UUID.randomUUID(), store.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.pin").value("PIN must contain exactly 6 digits"));
    }

    // -------------------------------------------------------------------------
    // Test 8: POST /api/admin/users/admin — password too short returns 400
    //
    // CreateAdminRequest enforces @Size(min = 8) on password.
    // -------------------------------------------------------------------------

    @Test
    void should_return_400_when_admin_password_is_too_short() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert — password "short" has 5 chars, below min=8
        mockMvc.perform(post("/api/admin/users/admin")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Short Password Admin",
                                  "username": "shortpwd.%s",
                                  "email": "shortpwd.%s@test.com",
                                  "password": "short"
                                }
                                """.formatted(UUID.randomUUID(), UUID.randomUUID())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.password").isNotEmpty());
    }
}
