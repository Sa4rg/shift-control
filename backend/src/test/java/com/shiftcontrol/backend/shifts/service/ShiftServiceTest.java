package com.shiftcontrol.backend.shifts.service;

import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.dto.OpenShiftRequest;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.model.ShiftType;
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShiftServiceTest {

    @Mock
    private ShiftRepository shiftRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ShiftService shiftService;

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store activeStore() {
        Store store = new Store();
        store.setName("São Bento");
        store.setActive(true);
        return store;
    }

    private Store inactiveStore() {
        Store store = new Store();
        store.setName("São Bento");
        store.setActive(false);
        return store;
    }

    private User activeStaffWithStore(Store store) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFullName("Sara Staff");
        user.setRole(Role.STAFF);
        user.setActive(true);
        user.setStore(store);
        return user;
    }

    private User inactiveStaffWithStore(Store store) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFullName("Sara Staff");
        user.setRole(Role.STAFF);
        user.setActive(false);
        user.setStore(store);
        return user;
    }

    private User adminUser() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFullName("Admin User");
        user.setRole(Role.ADMIN);
        user.setActive(true);
        return user;
    }

    // -------------------------------------------------------------------------
    // openShift tests
    // -------------------------------------------------------------------------

    @Test
    void should_open_shift_for_active_staff_with_active_store() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.existsByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(false);
        when(shiftRepository.save(any(Shift.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Shift result = shiftService.openShift(staffId, new OpenShiftRequest(ShiftType.DAY));

        // Assert
        assertThat(result.getStaff()).isSameAs(staff);
        assertThat(result.getStore()).isSameAs(store);
        assertThat(result.getType()).isEqualTo(ShiftType.DAY);
        assertThat(result.getStatus()).isEqualTo(ShiftStatus.OPEN);
        assertThat(result.getOpenedAt()).isNotNull();
        assertThat(result.getCreatedAt()).isNotNull();
        assertThat(result.getUpdatedAt()).isNotNull();
        assertThat(result.getClosedAt()).isNull();
        assertThat(result.getClosedBy()).isNull();
        verify(shiftRepository).save(any(Shift.class));
    }

    @Test
    void should_throw_when_user_not_found() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        when(userRepository.findById(staffId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> shiftService.openShift(staffId, new OpenShiftRequest(ShiftType.DAY)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");

        verify(shiftRepository, never()).save(any(Shift.class));
    }

    @Test
    void should_throw_when_user_is_not_staff() {
        // Arrange
        User admin = adminUser();
        UUID staffId = admin.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(admin));

        // Act + Assert
        assertThatThrownBy(() -> shiftService.openShift(staffId, new OpenShiftRequest(ShiftType.DAY)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only staff users can open shifts");

        verify(shiftRepository, never()).save(any(Shift.class));
    }

    @Test
    void should_throw_when_user_is_inactive() {
        // Arrange
        Store store = activeStore();
        User staff = inactiveStaffWithStore(store);
        UUID staffId = staff.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        // Act + Assert
        assertThatThrownBy(() -> shiftService.openShift(staffId, new OpenShiftRequest(ShiftType.DAY)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("User is inactive");

        verify(shiftRepository, never()).save(any(Shift.class));
    }

    @Test
    void should_throw_when_staff_has_no_store() {
        // Arrange
        User staff = new User();
        staff.setId(UUID.randomUUID());
        staff.setFullName("Sara Staff");
        staff.setRole(Role.STAFF);
        staff.setActive(true);
        staff.setStore(null);
        UUID staffId = staff.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        // Act + Assert
        assertThatThrownBy(() -> shiftService.openShift(staffId, new OpenShiftRequest(ShiftType.DAY)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Staff user has no store assigned");

        verify(shiftRepository, never()).save(any(Shift.class));
    }

    @Test
    void should_throw_when_store_is_inactive() {
        // Arrange
        Store store = inactiveStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        // Act + Assert
        assertThatThrownBy(() -> shiftService.openShift(staffId, new OpenShiftRequest(ShiftType.DAY)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Store is inactive");

        verify(shiftRepository, never()).save(any(Shift.class));
    }

    @Test
    void should_throw_when_staff_already_has_open_shift() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.existsByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> shiftService.openShift(staffId, new OpenShiftRequest(ShiftType.DAY)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Staff already has an open shift");

        verify(shiftRepository, never()).save(any(Shift.class));
    }

    // -------------------------------------------------------------------------
    // getById tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_shift_by_id() {
        // Arrange
        UUID shiftId = UUID.randomUUID();
        Shift shift = new Shift();
        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));

        // Act
        Shift result = shiftService.getById(shiftId);

        // Assert
        assertThat(result).isSameAs(shift);
    }

    @Test
    void should_throw_not_found_when_shift_id_does_not_exist() {
        // Arrange
        UUID shiftId = UUID.randomUUID();
        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> shiftService.getById(shiftId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Shift not found");
    }

    // -------------------------------------------------------------------------
    // listShifts tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_all_shifts_when_authenticated_user_is_admin() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        List<Shift> shifts = List.of(new Shift(), new Shift());
        when(shiftRepository.findAllWithDetails()).thenReturn(shifts);

        // Act
        List<Shift> result = shiftService.listShifts(adminId, Role.ADMIN);

        // Assert
        assertThat(result).isSameAs(shifts);
        verify(shiftRepository).findAllWithDetails();
        verify(shiftRepository, never()).findByStaffIdWithDetails(any());
    }

    @Test
    void should_return_only_staff_shifts_when_authenticated_user_is_staff() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        List<Shift> shifts = List.of(new Shift());
        when(shiftRepository.findByStaffIdWithDetails(staffId)).thenReturn(shifts);

        // Act
        List<Shift> result = shiftService.listShifts(staffId, Role.STAFF);

        // Assert
        assertThat(result).isSameAs(shifts);
        verify(shiftRepository).findByStaffIdWithDetails(staffId);
        verify(shiftRepository, never()).findAllWithDetails();
    }
}
