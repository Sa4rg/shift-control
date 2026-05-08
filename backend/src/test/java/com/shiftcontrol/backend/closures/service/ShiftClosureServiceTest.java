package com.shiftcontrol.backend.closures.service;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShiftClosureServiceTest {

    @Mock
    private ShiftClosureRepository shiftClosureRepository;

    @InjectMocks
    private ShiftClosureService shiftClosureService;

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private User staffWithId(UUID id) {
        User user = new User();
        user.setId(id);
        user.setRole(Role.STAFF);
        user.setActive(true);
        return user;
    }

    private ShiftClosure closureForStaff(User staff) {
        Shift shift = new Shift();
        shift.setStaff(staff);

        ShiftClosure closure = new ShiftClosure();
        closure.setShift(shift);
        return closure;
    }

    // -------------------------------------------------------------------------
    // getById tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_closure_by_id_for_admin() {
        // Arrange
        UUID closureId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        User staff = staffWithId(UUID.randomUUID());
        ShiftClosure closure = closureForStaff(staff);

        when(shiftClosureRepository.findWithDetailsById(closureId)).thenReturn(Optional.of(closure));

        // Act
        ShiftClosure result = shiftClosureService.getById(closureId, adminId, Role.ADMIN);

        // Assert
        assertThat(result).isSameAs(closure);
    }

    @Test
    void should_return_closure_by_id_for_shift_owner_staff() {
        // Arrange
        UUID closureId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        User staff = staffWithId(staffId);
        ShiftClosure closure = closureForStaff(staff);

        when(shiftClosureRepository.findWithDetailsById(closureId)).thenReturn(Optional.of(closure));

        // Act
        ShiftClosure result = shiftClosureService.getById(closureId, staffId, Role.STAFF);

        // Assert
        assertThat(result).isSameAs(closure);
    }

    @Test
    void should_throw_when_staff_accesses_other_staff_closure_by_id() {
        // Arrange
        UUID closureId = UUID.randomUUID();
        UUID ownerStaffId = UUID.randomUUID();
        UUID otherStaffId = UUID.randomUUID();
        User owner = staffWithId(ownerStaffId);
        ShiftClosure closure = closureForStaff(owner);

        when(shiftClosureRepository.findWithDetailsById(closureId)).thenReturn(Optional.of(closure));

        // Act + Assert
        assertThatThrownBy(() -> shiftClosureService.getById(closureId, otherStaffId, Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("You are not allowed to access this closure");
    }

    @Test
    void should_throw_not_found_when_closure_id_does_not_exist() {
        // Arrange
        UUID closureId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(shiftClosureRepository.findWithDetailsById(closureId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> shiftClosureService.getById(closureId, userId, Role.ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Closure not found");
    }

    // -------------------------------------------------------------------------
    // getByShiftId tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_closure_by_shift_id_for_admin() {
        // Arrange
        UUID shiftId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        User staff = staffWithId(UUID.randomUUID());
        ShiftClosure closure = closureForStaff(staff);

        when(shiftClosureRepository.findWithDetailsByShiftId(shiftId)).thenReturn(Optional.of(closure));

        // Act
        ShiftClosure result = shiftClosureService.getByShiftId(shiftId, adminId, Role.ADMIN);

        // Assert
        assertThat(result).isSameAs(closure);
    }

    @Test
    void should_return_closure_by_shift_id_for_shift_owner_staff() {
        // Arrange
        UUID shiftId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        User staff = staffWithId(staffId);
        ShiftClosure closure = closureForStaff(staff);

        when(shiftClosureRepository.findWithDetailsByShiftId(shiftId)).thenReturn(Optional.of(closure));

        // Act
        ShiftClosure result = shiftClosureService.getByShiftId(shiftId, staffId, Role.STAFF);

        // Assert
        assertThat(result).isSameAs(closure);
    }

    @Test
    void should_throw_when_staff_accesses_other_staff_closure_by_shift_id() {
        // Arrange
        UUID shiftId = UUID.randomUUID();
        UUID ownerStaffId = UUID.randomUUID();
        UUID otherStaffId = UUID.randomUUID();
        User owner = staffWithId(ownerStaffId);
        ShiftClosure closure = closureForStaff(owner);

        when(shiftClosureRepository.findWithDetailsByShiftId(shiftId)).thenReturn(Optional.of(closure));

        // Act + Assert
        assertThatThrownBy(() -> shiftClosureService.getByShiftId(shiftId, otherStaffId, Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("You are not allowed to access this closure");
    }

    @Test
    void should_throw_not_found_when_closure_shift_id_does_not_exist() {
        // Arrange
        UUID shiftId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(shiftClosureRepository.findWithDetailsByShiftId(shiftId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> shiftClosureService.getByShiftId(shiftId, userId, Role.ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Closure not found");
    }
}
