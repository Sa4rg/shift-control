package com.shiftcontrol.backend.users.service;

import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.model.ShiftType;
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.dto.CreateAdminRequest;
import com.shiftcontrol.backend.users.dto.CreateStaffRequest;
import com.shiftcontrol.backend.users.dto.MonthlyWorkHoursResponse;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ShiftRepository shiftRepository;

    @InjectMocks
    private UserService userService;

    // -------------------------------------------------------------------------
    // createStaff tests
    // -------------------------------------------------------------------------

    @Test
    void should_create_staff_with_hashed_pin() {
        // Arrange
        UUID storeId = UUID.randomUUID();

        Store store = new Store();
        store.setId(storeId);
        store.setActive(true);

        CreateStaffRequest request = new CreateStaffRequest(
                "Ana Costa", "ana.costa", "123456", storeId
        );

        when(userRepository.existsByUsernameIgnoreCase("ana.costa")).thenReturn(false);
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(passwordEncoder.encode("123456")).thenReturn("hashed_pin");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        User result = userService.createStaff(request);

        // Assert
        verify(userRepository).save(any(User.class));
        assertThat(result.getRole()).isEqualTo(Role.STAFF);
        assertThat(result.getPinHash()).isEqualTo("hashed_pin");
        assertThat(result.getPinHash()).isNotEqualTo("123456");
        assertThat(result.getPasswordHash()).isNull();
        assertThat(result.getStore()).isEqualTo(store);
        assertThat(result.isActive()).isTrue();
    }

    @Test
    void should_throw_when_staff_username_already_exists() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        CreateStaffRequest request = new CreateStaffRequest(
                "Ana Costa", "ana.costa", "123456", storeId
        );

        when(userRepository.existsByUsernameIgnoreCase("ana.costa")).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> userService.createStaff(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Username already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    void should_throw_when_staff_store_not_found() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        CreateStaffRequest request = new CreateStaffRequest(
                "Ana Costa", "ana.costa", "123456", storeId
        );

        when(userRepository.existsByUsernameIgnoreCase("ana.costa")).thenReturn(false);
        when(storeRepository.findById(storeId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> userService.createStaff(request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Store not found");

        verify(userRepository, never()).save(any());
    }

    @Test
    void should_throw_when_staff_store_is_inactive() {
        // Arrange
        UUID storeId = UUID.randomUUID();

        Store inactiveStore = new Store();
        inactiveStore.setId(storeId);
        inactiveStore.setActive(false);

        CreateStaffRequest request = new CreateStaffRequest(
                "Ana Costa", "ana.costa", "123456", storeId
        );

        when(userRepository.existsByUsernameIgnoreCase("ana.costa")).thenReturn(false);
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(inactiveStore));

        // Act + Assert
        assertThatThrownBy(() -> userService.createStaff(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Store is inactive");

        verify(userRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // createAdmin tests
    // -------------------------------------------------------------------------

    @Test
    void should_create_admin_with_hashed_password() {
        // Arrange
        CreateAdminRequest request = new CreateAdminRequest(
                "Carlos Admin", "carlos.admin", "carlos@example.com", "securePass1"
        );

        when(userRepository.existsByUsernameIgnoreCase("carlos.admin")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("carlos@example.com")).thenReturn(false);
        when(passwordEncoder.encode("securePass1")).thenReturn("hashed_password");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        User result = userService.createAdmin(request);

        // Assert
        verify(userRepository).save(any(User.class));
        assertThat(result.getRole()).isEqualTo(Role.ADMIN);
        assertThat(result.getPasswordHash()).isEqualTo("hashed_password");
        assertThat(result.getPasswordHash()).isNotEqualTo("securePass1");
        assertThat(result.getPinHash()).isNull();
        assertThat(result.getStore()).isNull();
        assertThat(result.isActive()).isTrue();
    }

    @Test
    void should_throw_when_admin_username_already_exists() {
        // Arrange
        CreateAdminRequest request = new CreateAdminRequest(
                "Carlos Admin", "carlos.admin", "carlos@example.com", "securePass1"
        );

        when(userRepository.existsByUsernameIgnoreCase("carlos.admin")).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> userService.createAdmin(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Username already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    void should_throw_when_admin_email_already_exists() {
        // Arrange
        CreateAdminRequest request = new CreateAdminRequest(
                "Carlos Admin", "carlos.admin", "carlos@example.com", "securePass1"
        );

        when(userRepository.existsByUsernameIgnoreCase("carlos.admin")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("carlos@example.com")).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> userService.createAdmin(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Email already exists");

        verify(userRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // listUsers tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_active_users_when_role_is_null_and_include_inactive_is_false() {
        // Arrange
        when(userRepository.findByActiveTrue()).thenReturn(List.of());

        // Act
        userService.listUsers(null, false);

        // Assert
        verify(userRepository).findByActiveTrue();
        verify(userRepository, never()).findAll();
        verify(userRepository, never()).findByRole(any());
        verify(userRepository, never()).findByRoleAndActiveTrue(any());
    }

    @Test
    void should_return_all_users_when_role_is_null_and_include_inactive_is_true() {
        // Arrange
        when(userRepository.findAll()).thenReturn(List.of());

        // Act
        userService.listUsers(null, true);

        // Assert
        verify(userRepository).findAll();
        verify(userRepository, never()).findByActiveTrue();
        verify(userRepository, never()).findByRole(any());
        verify(userRepository, never()).findByRoleAndActiveTrue(any());
    }

    @Test
    void should_return_active_users_by_role_when_role_is_provided_and_include_inactive_is_false() {
        // Arrange
        User staff = new User();
        staff.setRole(Role.STAFF);
        staff.setActive(true);

        when(userRepository.findByRoleAndActiveTrue(Role.STAFF)).thenReturn(List.of(staff));

        // Act
        List<User> result = userService.listUsers(Role.STAFF, false);

        // Assert
        verify(userRepository).findByRoleAndActiveTrue(Role.STAFF);
        verify(userRepository, never()).findByRole(any());
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRole()).isEqualTo(Role.STAFF);
    }

    @Test
    void should_return_all_users_by_role_when_role_is_provided_and_include_inactive_is_true() {
        // Arrange
        User active = new User();
        active.setRole(Role.STAFF);
        active.setActive(true);

        User inactive = new User();
        inactive.setRole(Role.STAFF);
        inactive.setActive(false);

        when(userRepository.findByRole(Role.STAFF)).thenReturn(List.of(active, inactive));

        // Act
        List<User> result = userService.listUsers(Role.STAFF, true);

        // Assert
        verify(userRepository).findByRole(Role.STAFF);
        verify(userRepository, never()).findByRoleAndActiveTrue(any());
        assertThat(result).hasSize(2);
    }

    // -------------------------------------------------------------------------
    // getById tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_user_by_id() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setFullName("Ana Costa");
        user.setRole(Role.STAFF);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        User result = userService.getById(userId);

        // Assert
        assertThat(result.getId()).isEqualTo(userId);
        verify(userRepository).findById(userId);
    }

    @Test
    void should_throw_not_found_when_user_id_does_not_exist() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> userService.getById(userId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");

        verify(userRepository).findById(userId);
    }

    // -------------------------------------------------------------------------
    // deactivateUser tests
    // -------------------------------------------------------------------------

    @Test
    void should_deactivate_user_and_set_audit_fields() {
        // Arrange
        UUID targetUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        User target = new User();
        target.setId(targetUserId);
        target.setFullName("Ana Costa");
        target.setRole(Role.STAFF);
        target.setActive(true);

        User admin = new User();
        admin.setId(adminId);
        admin.setFullName("Carlos Admin");
        admin.setRole(Role.ADMIN);
        admin.setActive(true);

        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(target));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        User result = userService.deactivateUser(targetUserId, adminId);

        // Assert
        verify(userRepository).save(target);
        assertThat(result.isActive()).isFalse();
        assertThat(result.getDeactivatedBy()).isSameAs(admin);
        assertThat(result.getDeactivatedAt()).isNotNull();
        assertThat(result.getUpdatedAt()).isNotNull();
    }

    @Test
    void should_throw_when_deactivated_by_user_not_found() {
        // Arrange
        UUID targetUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        User target = new User();
        target.setId(targetUserId);
        target.setActive(true);

        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(target));
        when(userRepository.findById(adminId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> userService.deactivateUser(targetUserId, adminId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");

        verify(userRepository, never()).save(any());
    }

    @Test
    void should_throw_not_found_when_deactivating_missing_user() {
        // Arrange
        UUID targetUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        when(userRepository.findById(targetUserId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> userService.deactivateUser(targetUserId, adminId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");

        verify(userRepository, never()).save(any());
    }

    @Test
    void should_throw_business_exception_when_user_is_already_inactive() {
        // Arrange
        UUID targetUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        User inactive = new User();
        inactive.setId(targetUserId);
        inactive.setActive(false);

        User admin = new User();
        admin.setId(adminId);
        admin.setRole(Role.ADMIN);
        admin.setActive(true);

        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(inactive));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        // Act + Assert
        assertThatThrownBy(() -> userService.deactivateUser(targetUserId, adminId))
                .isInstanceOf(BusinessException.class)
                .hasMessage("User is already inactive");

        verify(userRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // getMonthlyWorkHours tests
    // -------------------------------------------------------------------------

    @Test
    void should_calculate_monthly_work_hours_for_staff_with_two_closed_shifts() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        User staff = new User();
        staff.setId(staffId);
        staff.setFullName("Ana Costa");
        staff.setRole(Role.STAFF);
        staff.setActive(true);

        Store store = new Store();
        store.setId(UUID.randomUUID());

        // Shift 1: July 6, 2026 08:00 - 17:00 UTC = 9 hours = 540 minutes
        Shift shift1 = new Shift();
        shift1.setStaff(staff);
        shift1.setStore(store);
        shift1.setType(ShiftType.DAY);
        shift1.setStatus(ShiftStatus.CLOSED);
        shift1.setOpenedAt(Instant.parse("2026-07-06T08:00:00Z"));
        shift1.setClosedAt(Instant.parse("2026-07-06T17:00:00Z"));

        // Shift 2: July 7, 2026 08:00 - 12:30 UTC = 4.5 hours = 270 minutes
        Shift shift2 = new Shift();
        shift2.setStaff(staff);
        shift2.setStore(store);
        shift2.setType(ShiftType.DAY);
        shift2.setStatus(ShiftStatus.CLOSED);
        shift2.setOpenedAt(Instant.parse("2026-07-07T08:00:00Z"));
        shift2.setClosedAt(Instant.parse("2026-07-07T12:30:00Z"));

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findClosedShiftsByStaffAndMonth(
                staffId,
                Instant.parse("2026-07-01T00:00:00Z"),
                Instant.parse("2026-08-01T00:00:00Z")
        )).thenReturn(List.of(shift1, shift2));

        // Act
        MonthlyWorkHoursResponse result = userService.getMonthlyWorkHours(staffId, 2026, 7);

        // Assert
        assertThat(result.staffId()).isEqualTo(staffId);
        assertThat(result.staffName()).isEqualTo("Ana Costa");
        assertThat(result.year()).isEqualTo(2026);
        assertThat(result.month()).isEqualTo(7);
        assertThat(result.totalMinutes()).isEqualTo(810); // 540 + 270
        assertThat(result.closedShiftCount()).isEqualTo(2);
    }

    @Test
    void should_ignore_open_shifts_when_calculating_monthly_work_hours() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        User staff = new User();
        staff.setId(staffId);
        staff.setFullName("Ana Costa");
        staff.setRole(Role.STAFF);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findClosedShiftsByStaffAndMonth(
                staffId,
                Instant.parse("2026-07-01T00:00:00Z"),
                Instant.parse("2026-08-01T00:00:00Z")
        )).thenReturn(List.of()); // Only closed shifts returned by repository

        // Act
        MonthlyWorkHoursResponse result = userService.getMonthlyWorkHours(staffId, 2026, 7);

        // Assert
        assertThat(result.totalMinutes()).isEqualTo(0);
        assertThat(result.closedShiftCount()).isEqualTo(0);
    }

    @Test
    void should_ignore_shifts_outside_selected_month() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        User staff = new User();
        staff.setId(staffId);
        staff.setFullName("Ana Costa");
        staff.setRole(Role.STAFF);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findClosedShiftsByStaffAndMonth(
                staffId,
                Instant.parse("2026-07-01T00:00:00Z"),
                Instant.parse("2026-08-01T00:00:00Z")
        )).thenReturn(List.of()); // Repository filters by date range

        // Act
        MonthlyWorkHoursResponse result = userService.getMonthlyWorkHours(staffId, 2026, 7);

        // Assert
        assertThat(result.totalMinutes()).isEqualTo(0);
        assertThat(result.closedShiftCount()).isEqualTo(0);
    }

    @Test
    void should_count_only_overlapping_minutes_for_overnight_shift_crossing_month_boundary() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        User staff = new User();
        staff.setId(staffId);
        staff.setFullName("Ana Costa");
        staff.setRole(Role.STAFF);

        Store store = new Store();
        store.setId(UUID.randomUUID());

        // Shift crosses July 31 23:00 to Aug 1 03:00 UTC = 4 hours total
        // July overlap: 60 minutes (23:00-00:00)
        Shift overnightShift = new Shift();
        overnightShift.setStaff(staff);
        overnightShift.setStore(store);
        overnightShift.setType(ShiftType.NIGHT);
        overnightShift.setStatus(ShiftStatus.CLOSED);
        overnightShift.setOpenedAt(Instant.parse("2026-07-31T23:00:00Z"));
        overnightShift.setClosedAt(Instant.parse("2026-08-01T03:00:00Z"));

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findClosedShiftsByStaffAndMonth(
                staffId,
                Instant.parse("2026-07-01T00:00:00Z"),
                Instant.parse("2026-08-01T00:00:00Z")
        )).thenReturn(List.of(overnightShift));

        // Act
        MonthlyWorkHoursResponse result = userService.getMonthlyWorkHours(staffId, 2026, 7);

        // Assert
        assertThat(result.totalMinutes()).isEqualTo(60); // Only July portion
        assertThat(result.closedShiftCount()).isEqualTo(1);
    }

    @Test
    void should_throw_business_exception_when_requesting_monthly_hours_for_admin_user() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        User admin = new User();
        admin.setId(adminId);
        admin.setFullName("Carlos Admin");
        admin.setRole(Role.ADMIN);

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        // Act + Assert
        assertThatThrownBy(() -> userService.getMonthlyWorkHours(adminId, 2026, 7))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Monthly work hours are only available for STAFF users");
    }

    @Test
    void should_throw_business_exception_when_month_is_invalid_below_range() {
        // Arrange
        UUID staffId = UUID.randomUUID();

        // Act + Assert
        assertThatThrownBy(() -> userService.getMonthlyWorkHours(staffId, 2026, 0))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Month must be between 1 and 12");
    }

    @Test
    void should_throw_business_exception_when_month_is_invalid_above_range() {
        // Arrange
        UUID staffId = UUID.randomUUID();

        // Act + Assert
        assertThatThrownBy(() -> userService.getMonthlyWorkHours(staffId, 2026, 13))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Month must be between 1 and 12");
    }

    @Test
    void should_throw_not_found_when_user_does_not_exist() {
        // Arrange
        UUID staffId = UUID.randomUUID();

        when(userRepository.findById(staffId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> userService.getMonthlyWorkHours(staffId, 2026, 7))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");
    }
}
