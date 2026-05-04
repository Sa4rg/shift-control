package com.shiftcontrol.backend.auth.service;

import com.shiftcontrol.backend.auth.dto.AdminLoginRequest;
import com.shiftcontrol.backend.auth.dto.AuthResponse;
import com.shiftcontrol.backend.auth.dto.StaffLoginRequest;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.security.JwtService;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    // -------------------------------------------------------------------------
    // loginStaff tests
    // -------------------------------------------------------------------------

    @Test
    void should_login_staff_with_valid_pin() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setUsername("ana.staff");
        user.setPinHash("hashed_pin");
        user.setRole(Role.STAFF);
        user.setActive(true);

        StaffLoginRequest request = new StaffLoginRequest("ana.staff", "123456");

        when(userRepository.findByUsernameIgnoreCase("ana.staff")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("123456", "hashed_pin")).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("jwt.token.staff");

        // Act
        AuthResponse response = authService.loginStaff(request);

        // Assert
        assertThat(response.accessToken()).isEqualTo("jwt.token.staff");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.user().username()).isEqualTo("ana.staff");
        assertThat(response.user().role()).isEqualTo(Role.STAFF);
        verify(jwtService).generateAccessToken(user);
    }

    @Test
    void should_throw_invalid_credentials_when_staff_not_found() {
        // Arrange
        StaffLoginRequest request = new StaffLoginRequest("unknown", "123456");
        when(userRepository.findByUsernameIgnoreCase("unknown")).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> authService.loginStaff(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid credentials");

        verify(jwtService, never()).generateAccessToken(null);
    }

    @Test
    void should_throw_invalid_credentials_when_staff_role_is_not_staff() {
        // Arrange
        User admin = new User();
        admin.setUsername("carlos.admin");
        admin.setRole(Role.ADMIN);
        admin.setActive(true);

        StaffLoginRequest request = new StaffLoginRequest("carlos.admin", "123456");
        when(userRepository.findByUsernameIgnoreCase("carlos.admin")).thenReturn(Optional.of(admin));

        // Act + Assert
        assertThatThrownBy(() -> authService.loginStaff(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid credentials");

        verify(jwtService, never()).generateAccessToken(admin);
    }

    @Test
    void should_throw_invalid_credentials_when_staff_is_inactive() {
        // Arrange
        User user = new User();
        user.setUsername("ana.staff");
        user.setRole(Role.STAFF);
        user.setActive(false);

        StaffLoginRequest request = new StaffLoginRequest("ana.staff", "123456");
        when(userRepository.findByUsernameIgnoreCase("ana.staff")).thenReturn(Optional.of(user));

        // Act + Assert
        assertThatThrownBy(() -> authService.loginStaff(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid credentials");

        verify(jwtService, never()).generateAccessToken(user);
    }

    @Test
    void should_throw_invalid_credentials_when_staff_pin_is_invalid() {
        // Arrange
        User user = new User();
        user.setUsername("ana.staff");
        user.setPinHash("hashed_pin");
        user.setRole(Role.STAFF);
        user.setActive(true);

        StaffLoginRequest request = new StaffLoginRequest("ana.staff", "999999");
        when(userRepository.findByUsernameIgnoreCase("ana.staff")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("999999", "hashed_pin")).thenReturn(false);

        // Act + Assert
        assertThatThrownBy(() -> authService.loginStaff(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid credentials");

        verify(jwtService, never()).generateAccessToken(user);
    }

    // -------------------------------------------------------------------------
    // loginAdmin tests
    // -------------------------------------------------------------------------

    @Test
    void should_login_admin_with_valid_password() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setUsername("carlos.admin");
        user.setPasswordHash("hashed_password");
        user.setRole(Role.ADMIN);
        user.setActive(true);

        AdminLoginRequest request = new AdminLoginRequest("carlos.admin", "securePass1");

        when(userRepository.findByUsernameIgnoreCase("carlos.admin")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("securePass1", "hashed_password")).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("jwt.token.admin");

        // Act
        AuthResponse response = authService.loginAdmin(request);

        // Assert
        assertThat(response.accessToken()).isEqualTo("jwt.token.admin");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.user().username()).isEqualTo("carlos.admin");
        assertThat(response.user().role()).isEqualTo(Role.ADMIN);
        assertThat(response.user().storeId()).isNull();
        verify(jwtService).generateAccessToken(user);
    }

    @Test
    void should_throw_invalid_credentials_when_admin_not_found() {
        // Arrange
        AdminLoginRequest request = new AdminLoginRequest("unknown", "securePass1");
        when(userRepository.findByUsernameIgnoreCase("unknown")).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> authService.loginAdmin(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid credentials");

        verify(jwtService, never()).generateAccessToken(null);
    }

    @Test
    void should_throw_invalid_credentials_when_admin_role_is_not_admin() {
        // Arrange
        User staff = new User();
        staff.setUsername("ana.staff");
        staff.setRole(Role.STAFF);
        staff.setActive(true);

        AdminLoginRequest request = new AdminLoginRequest("ana.staff", "securePass1");
        when(userRepository.findByUsernameIgnoreCase("ana.staff")).thenReturn(Optional.of(staff));

        // Act + Assert
        assertThatThrownBy(() -> authService.loginAdmin(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid credentials");

        verify(jwtService, never()).generateAccessToken(staff);
    }

    @Test
    void should_throw_invalid_credentials_when_admin_is_inactive() {
        // Arrange
        User user = new User();
        user.setUsername("carlos.admin");
        user.setRole(Role.ADMIN);
        user.setActive(false);

        AdminLoginRequest request = new AdminLoginRequest("carlos.admin", "securePass1");
        when(userRepository.findByUsernameIgnoreCase("carlos.admin")).thenReturn(Optional.of(user));

        // Act + Assert
        assertThatThrownBy(() -> authService.loginAdmin(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid credentials");

        verify(jwtService, never()).generateAccessToken(user);
    }

    @Test
    void should_throw_invalid_credentials_when_admin_password_is_invalid() {
        // Arrange
        User user = new User();
        user.setUsername("carlos.admin");
        user.setPasswordHash("hashed_password");
        user.setRole(Role.ADMIN);
        user.setActive(true);

        AdminLoginRequest request = new AdminLoginRequest("carlos.admin", "wrongPass");
        when(userRepository.findByUsernameIgnoreCase("carlos.admin")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPass", "hashed_password")).thenReturn(false);

        // Act + Assert
        assertThatThrownBy(() -> authService.loginAdmin(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid credentials");

        verify(jwtService, never()).generateAccessToken(user);
    }
}
