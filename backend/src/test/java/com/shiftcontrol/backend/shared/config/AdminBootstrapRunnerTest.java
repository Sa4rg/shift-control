package com.shiftcontrol.backend.shared.config;

import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;

import static com.shiftcontrol.backend.shared.config.AdminBootstrapRunner.MINIMUM_PASSWORD_LENGTH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapRunnerTest {

    private static final String VALID_USERNAME = "bootstrap_admin";
    private static final String VALID_PASSWORD = "SecurePassword1!";  // 16 chars — meets minimum 12
    private static final String VALID_FULL_NAME = "Initial Admin";
    private static final String VALID_EMAIL = "admin@example.com";

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminBootstrapProperties properties;
    private AdminBootstrapRunner runner;

    @BeforeEach
    void setUp() {
        properties = new AdminBootstrapProperties();
        runner = new AdminBootstrapRunner(properties, userRepository, passwordEncoder);
    }

    // -------------------------------------------------------------------------
    // Test 1: disabled does nothing
    // -------------------------------------------------------------------------

    @Test
    void disabled_does_not_create_admin() {
        properties.setEnabled(false);

        runner.run(null);

        verify(userRepository, never()).save(any());
        verify(userRepository, never()).findByRoleAndActiveTrue(any());
    }

    // -------------------------------------------------------------------------
    // Test 2: creates exactly one admin when enabled and no active admin exists
    // -------------------------------------------------------------------------

    @Test
    void enabled_creates_admin_when_no_active_admin_exists() {
        configureValidProperties();
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(Collections.emptyList());
        when(userRepository.existsByUsernameIgnoreCase(VALID_USERNAME)).thenReturn(false);
        when(passwordEncoder.encode(VALID_PASSWORD)).thenReturn("$argon2id$hashed");

        runner.run(null);

        verify(userRepository).save(any(User.class));
    }

    // -------------------------------------------------------------------------
    // Test 3: created admin has role ADMIN and active=true
    // -------------------------------------------------------------------------

    @Test
    void created_admin_has_role_admin_and_is_active() {
        configureValidProperties();
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(Collections.emptyList());
        when(userRepository.existsByUsernameIgnoreCase(VALID_USERNAME)).thenReturn(false);
        when(passwordEncoder.encode(VALID_PASSWORD)).thenReturn("$argon2id$hashed");

        runner.run(null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(Role.ADMIN);
        assertThat(saved.isActive()).isTrue();
        assertThat(saved.getStore()).isNull();
        assertThat(saved.getPinHash()).isNull();
        assertThat(saved.getUsername()).isEqualTo(VALID_USERNAME);
        assertThat(saved.getFullName()).isEqualTo(VALID_FULL_NAME);
        assertThat(saved.getEmail()).isEqualTo(VALID_EMAIL);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    // -------------------------------------------------------------------------
    // Test 4: password is encoded before storage
    // -------------------------------------------------------------------------

    @Test
    void created_admin_password_is_hashed_via_encoder() {
        configureValidProperties();
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(Collections.emptyList());
        when(userRepository.existsByUsernameIgnoreCase(VALID_USERNAME)).thenReturn(false);
        when(passwordEncoder.encode(VALID_PASSWORD)).thenReturn("$argon2id$hashed");

        runner.run(null);

        verify(passwordEncoder).encode(VALID_PASSWORD);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("$argon2id$hashed");
    }

    // -------------------------------------------------------------------------
    // Test 5: plaintext password is not stored
    // -------------------------------------------------------------------------

    @Test
    void plaintext_password_is_not_stored() {
        configureValidProperties();
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(Collections.emptyList());
        when(userRepository.existsByUsernameIgnoreCase(VALID_USERNAME)).thenReturn(false);
        when(passwordEncoder.encode(VALID_PASSWORD)).thenReturn("$argon2id$hashed");

        runner.run(null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isNotEqualTo(VALID_PASSWORD);
    }

    // -------------------------------------------------------------------------
    // Test 6: does not create duplicate when active admin already exists
    // -------------------------------------------------------------------------

    @Test
    void enabled_does_not_create_admin_when_active_admin_exists() {
        configureValidProperties();
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(List.of(existingAdmin()));

        runner.run(null);

        verify(userRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 7: fails startup when admin exists and fail-if-admin-exists=true
    // -------------------------------------------------------------------------

    @Test
    void fails_when_admin_exists_and_fail_flag_is_true() {
        configureValidProperties();
        properties.setFailIfAdminExists(true);
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(List.of(existingAdmin()));

        assertThatThrownBy(() -> runner.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("active admin user already exists");
    }

    // -------------------------------------------------------------------------
    // Test 8: fails with clear message when username is blank
    // -------------------------------------------------------------------------

    @Test
    void fails_when_username_is_blank() {
        properties.setEnabled(true);
        properties.setUsername("   ");
        properties.setPassword(VALID_PASSWORD);

        assertThatThrownBy(() -> runner.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("username is required");
    }

    // -------------------------------------------------------------------------
    // Test 9: fails with clear message when password is blank
    // -------------------------------------------------------------------------

    @Test
    void fails_when_password_is_blank() {
        properties.setEnabled(true);
        properties.setUsername(VALID_USERNAME);
        properties.setPassword("   ");

        assertThatThrownBy(() -> runner.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("password is required");
    }

    // -------------------------------------------------------------------------
    // Test 10: fails with clear message when password is too short
    // -------------------------------------------------------------------------

    @Test
    void fails_when_password_is_shorter_than_minimum() {
        properties.setEnabled(true);
        properties.setUsername(VALID_USERNAME);
        properties.setPassword("Short1!"); // 7 chars — below minimum 12

        assertThatThrownBy(() -> runner.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least " + MINIMUM_PASSWORD_LENGTH + " characters");
    }

    // -------------------------------------------------------------------------
    // Additional: fails when username is already taken (regardless of role)
    // -------------------------------------------------------------------------

    @Test
    void fails_when_bootstrap_username_already_exists() {
        configureValidProperties();
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(Collections.emptyList());
        when(userRepository.existsByUsernameIgnoreCase(VALID_USERNAME)).thenReturn(true);

        assertThatThrownBy(() -> runner.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already taken");

        verify(userRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Additional: email defaults to null when left blank
    // -------------------------------------------------------------------------

    @Test
    void created_admin_email_is_null_when_not_provided() {
        properties.setEnabled(true);
        properties.setUsername(VALID_USERNAME);
        properties.setPassword(VALID_PASSWORD);
        properties.setFullName(VALID_FULL_NAME);
        properties.setEmail("");  // blank — no email provided
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(Collections.emptyList());
        when(userRepository.existsByUsernameIgnoreCase(VALID_USERNAME)).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$argon2id$hashed");

        runner.run(null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isNull();
    }

    // -------------------------------------------------------------------------
    // Additional: fullName defaults to "Initial Admin" when blank
    // -------------------------------------------------------------------------

    @Test
    void full_name_defaults_to_initial_admin_when_blank() {
        properties.setEnabled(true);
        properties.setUsername(VALID_USERNAME);
        properties.setPassword(VALID_PASSWORD);
        properties.setFullName("");  // blank — should fall back to default
        when(userRepository.findByRoleAndActiveTrue(Role.ADMIN)).thenReturn(Collections.emptyList());
        when(userRepository.existsByUsernameIgnoreCase(VALID_USERNAME)).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$argon2id$hashed");

        runner.run(null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getFullName()).isEqualTo("Initial Admin");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void configureValidProperties() {
        properties.setEnabled(true);
        properties.setUsername(VALID_USERNAME);
        properties.setPassword(VALID_PASSWORD);
        properties.setFullName(VALID_FULL_NAME);
        properties.setEmail(VALID_EMAIL);
    }

    private User existingAdmin() {
        User admin = new User();
        admin.setRole(Role.ADMIN);
        admin.setActive(true);
        admin.setUsername("existing_admin");
        return admin;
    }
}
