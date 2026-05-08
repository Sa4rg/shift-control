package com.shiftcontrol.backend.shifts.service;

import com.shiftcontrol.backend.closures.dto.CloseShiftRequest;
import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.sales.model.InvoiceStatus;
import com.shiftcontrol.backend.sales.model.PaymentMethod;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SalePayment;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.sales.repository.SaleRepository;
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

import java.math.BigDecimal;
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

    @Mock
    private ShiftClosureRepository shiftClosureRepository;

    @Mock
    private SaleRepository saleRepository;

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

    private Store activeStoreWithBaseCash(String amount) {
        Store store = new Store();
        store.setName("São Bento");
        store.setActive(true);
        store.setBaseCashAmount(new BigDecimal(amount));
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

    private User anotherActiveStaffWithStore(Store store) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFullName("Another Staff");
        user.setRole(Role.STAFF);
        user.setActive(true);
        user.setStore(store);
        return user;
    }

    private Shift openShift(User staff, Store store) {
        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(store);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.OPEN);
        return shift;
    }

    private Shift closedShift(User staff, Store store) {
        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(store);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.CLOSED);
        return shift;
    }

    private Sale saleWithPayment(BigDecimal finalTotal, InvoiceStatus invoiceStatus,
                                  PaymentMethod method, BigDecimal amount) {
        Sale sale = new Sale();
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(invoiceStatus);
        sale.setFinalTotalAmount(finalTotal);

        SalePayment payment = new SalePayment();
        payment.setMethod(method);
        payment.setAmount(amount);

        sale.addPayment(payment);

        return sale;
    }

    private CloseShiftRequest closeShiftRequest(String confirmedCash, String confirmedMb, String note) {
        return new CloseShiftRequest(
                new BigDecimal(confirmedCash),
                new BigDecimal(confirmedMb),
                note
        );
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

    // -------------------------------------------------------------------------
    // closeShift tests
    // -------------------------------------------------------------------------

    @Test
    void should_close_shift_with_status_closed_ok_when_totals_match() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShift(staff, store);
        UUID shiftId = UUID.randomUUID();

        List<Sale> activeSales = List.of(
                saleWithPayment(new BigDecimal("40.00"), InvoiceStatus.INVOICED, PaymentMethod.CASH,        new BigDecimal("40.00")),
                saleWithPayment(new BigDecimal("25.00"), InvoiceStatus.PENDING,  PaymentMethod.MB,          new BigDecimal("25.00")),
                saleWithPayment(new BigDecimal("10.00"), InvoiceStatus.INVOICED, PaymentMethod.GLOVO_CASH,  new BigDecimal("10.00")),
                saleWithPayment(new BigDecimal("15.00"), InvoiceStatus.INVOICED, PaymentMethod.GLOVO_ONLINE, new BigDecimal("15.00"))
        );

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftClosureRepository.existsByShift(shift)).thenReturn(false);
        when(saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE)).thenReturn(activeSales);
        when(shiftClosureRepository.save(any(ShiftClosure.class))).thenAnswer(inv -> inv.getArgument(0));

        CloseShiftRequest request = closeShiftRequest("153.00", "25.00", "  End of day ok  ");

        // Act
        ShiftClosure closure = shiftService.closeShift(shiftId, staffId, request);

        // Assert
        assertThat(closure.getTotalCash()).isEqualByComparingTo("40.00");
        assertThat(closure.getTotalMb()).isEqualByComparingTo("25.00");
        assertThat(closure.getTotalGlovoCash()).isEqualByComparingTo("10.00");
        assertThat(closure.getTotalGlovoOnline()).isEqualByComparingTo("15.00");
        assertThat(closure.getTotalSales()).isEqualByComparingTo("90.00");
        assertThat(closure.getPendingInvoiceTotal()).isEqualByComparingTo("25.00");
        assertThat(closure.getCashToWithdraw()).isEqualByComparingTo("50.00");
        assertThat(closure.getExpectedPhysicalCash()).isEqualByComparingTo("153.00");
        assertThat(closure.getConfirmedCashAmount()).isEqualByComparingTo("153.00");
        assertThat(closure.getConfirmedMbAmount()).isEqualByComparingTo("25.00");
        assertThat(closure.getCashDifference()).isEqualByComparingTo("0.00");
        assertThat(closure.getMbDifference()).isEqualByComparingTo("0.00");
        assertThat(closure.getStatus()).isEqualTo(ClosureStatus.CLOSED_OK);
        assertThat(closure.getNote()).isEqualTo("End of day ok");
        assertThat(closure.getCreatedAt()).isNotNull();
        assertThat(closure.getUpdatedAt()).isNotNull();
        assertThat(shift.getStatus()).isEqualTo(ShiftStatus.CLOSED);
        assertThat(shift.getClosedAt()).isNotNull();
        assertThat(shift.getClosedBy()).isSameAs(staff);
        assertThat(shift.getUpdatedAt()).isNotNull();
        verify(shiftClosureRepository).save(any(ShiftClosure.class));
    }

    @Test
    void should_close_shift_with_status_closed_with_incident_when_cash_or_mb_difference_exists() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShift(staff, store);
        UUID shiftId = UUID.randomUUID();

        List<Sale> activeSales = List.of(
                saleWithPayment(new BigDecimal("40.00"), InvoiceStatus.INVOICED, PaymentMethod.CASH, new BigDecimal("40.00")),
                saleWithPayment(new BigDecimal("25.00"), InvoiceStatus.INVOICED, PaymentMethod.MB,   new BigDecimal("25.00"))
        );

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftClosureRepository.existsByShift(shift)).thenReturn(false);
        when(saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE)).thenReturn(activeSales);
        when(shiftClosureRepository.save(any(ShiftClosure.class))).thenAnswer(inv -> inv.getArgument(0));

        // confirmedCash 140 vs expected (103+40=143) → diff -3.00
        // confirmedMb  20  vs expected  25           → diff -5.00
        CloseShiftRequest request = closeShiftRequest("140.00", "20.00", null);

        // Act
        ShiftClosure closure = shiftService.closeShift(shiftId, staffId, request);

        // Assert
        assertThat(closure.getCashDifference()).isEqualByComparingTo("-3.00");
        assertThat(closure.getMbDifference()).isEqualByComparingTo("-5.00");
        assertThat(closure.getStatus()).isEqualTo(ClosureStatus.CLOSED_WITH_INCIDENT);
        assertThat(shift.getStatus()).isEqualTo(ShiftStatus.CLOSED);
        verify(shiftClosureRepository).save(any(ShiftClosure.class));
    }

    @Test
    void should_ignore_cancelled_sales_when_closing_shift() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShift(staff, store);
        UUID shiftId = UUID.randomUUID();

        // Only the active sale is returned; cancelled sale is never returned by the repository
        List<Sale> activeSales = List.of(
                saleWithPayment(new BigDecimal("40.00"), InvoiceStatus.INVOICED, PaymentMethod.CASH, new BigDecimal("40.00"))
        );

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftClosureRepository.existsByShift(shift)).thenReturn(false);
        when(saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE)).thenReturn(activeSales);
        when(shiftClosureRepository.save(any(ShiftClosure.class))).thenAnswer(inv -> inv.getArgument(0));

        // expectedPhysicalCash = 103 + 40 = 143
        CloseShiftRequest request = closeShiftRequest("143.00", "0.00", null);

        // Act
        ShiftClosure closure = shiftService.closeShift(shiftId, staffId, request);

        // Assert
        assertThat(closure.getTotalSales()).isEqualByComparingTo("40.00");
        assertThat(closure.getTotalCash()).isEqualByComparingTo("40.00");
        assertThat(closure.getExpectedPhysicalCash()).isEqualByComparingTo("143.00");
        assertThat(closure.getStatus()).isEqualTo(ClosureStatus.CLOSED_OK);
        verify(saleRepository).findByShiftAndStatus(shift, SaleStatus.ACTIVE);
    }

    @Test
    void should_allow_admin_to_close_shift() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User staff = activeStaffWithStore(store);
        User admin = adminUser();
        UUID adminId = admin.getId();
        Shift shift = openShift(staff, store);
        UUID shiftId = UUID.randomUUID();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(shiftClosureRepository.existsByShift(shift)).thenReturn(false);
        when(saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE)).thenReturn(List.of());
        when(shiftClosureRepository.save(any(ShiftClosure.class))).thenAnswer(inv -> inv.getArgument(0));

        // confirmedCash = baseCashAmount (no sales), confirmedMb = 0
        CloseShiftRequest request = closeShiftRequest("103.00", "0.00", null);

        // Act
        ShiftClosure closure = shiftService.closeShift(shiftId, adminId, request);

        // Assert
        assertThat(closure.getClosedBy()).isSameAs(admin);
        assertThat(closure.getStatus()).isEqualTo(ClosureStatus.CLOSED_OK);
        assertThat(shift.getStatus()).isEqualTo(ShiftStatus.CLOSED);
        verify(shiftClosureRepository).save(any(ShiftClosure.class));
    }

    @Test
    void should_throw_not_found_when_shift_does_not_exist() {
        // Arrange
        UUID shiftId = UUID.randomUUID();
        UUID closedByUserId = UUID.randomUUID();
        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.empty());

        CloseShiftRequest request = closeShiftRequest("103.00", "0.00", null);

        // Act + Assert
        assertThatThrownBy(() -> shiftService.closeShift(shiftId, closedByUserId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Shift not found");

        verify(shiftClosureRepository, never()).save(any(ShiftClosure.class));
    }

    @Test
    void should_throw_not_found_when_closed_by_user_does_not_exist() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User staff = activeStaffWithStore(store);
        Shift shift = openShift(staff, store);
        UUID shiftId = UUID.randomUUID();
        UUID closedByUserId = UUID.randomUUID();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(closedByUserId)).thenReturn(Optional.empty());

        CloseShiftRequest request = closeShiftRequest("103.00", "0.00", null);

        // Act + Assert
        assertThatThrownBy(() -> shiftService.closeShift(shiftId, closedByUserId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");

        verify(shiftClosureRepository, never()).save(any(ShiftClosure.class));
    }

    @Test
    void should_throw_when_shift_is_already_closed() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User staff = activeStaffWithStore(store);
        Shift shift = closedShift(staff, store);
        UUID shiftId = UUID.randomUUID();
        UUID staffId = staff.getId();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        CloseShiftRequest request = closeShiftRequest("103.00", "0.00", null);

        // Act + Assert
        assertThatThrownBy(() -> shiftService.closeShift(shiftId, staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Shift is already closed");

        verify(shiftClosureRepository, never()).save(any(ShiftClosure.class));
    }

    @Test
    void should_throw_when_shift_closure_already_exists() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User staff = activeStaffWithStore(store);
        Shift shift = openShift(staff, store);
        UUID shiftId = UUID.randomUUID();
        UUID staffId = staff.getId();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftClosureRepository.existsByShift(shift)).thenReturn(true);

        CloseShiftRequest request = closeShiftRequest("103.00", "0.00", null);

        // Act + Assert
        assertThatThrownBy(() -> shiftService.closeShift(shiftId, staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Shift closure already exists");

        verify(shiftClosureRepository, never()).save(any(ShiftClosure.class));
    }

    @Test
    void should_throw_when_user_is_not_shift_owner_or_admin() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User owner = activeStaffWithStore(store);
        User otherStaff = anotherActiveStaffWithStore(store);
        UUID otherStaffId = otherStaff.getId();
        Shift shift = openShift(owner, store);
        UUID shiftId = UUID.randomUUID();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(otherStaffId)).thenReturn(Optional.of(otherStaff));
        when(shiftClosureRepository.existsByShift(shift)).thenReturn(false);

        CloseShiftRequest request = closeShiftRequest("103.00", "0.00", null);

        // Act + Assert
        assertThatThrownBy(() -> shiftService.closeShift(shiftId, otherStaffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only shift owner or admin can close shift");

        verify(shiftClosureRepository, never()).save(any(ShiftClosure.class));
    }

    @Test
    void should_throw_when_closed_by_user_is_inactive() {
        // Arrange
        Store store = activeStoreWithBaseCash("103.00");
        User staff = inactiveStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShift(staff, store);
        UUID shiftId = UUID.randomUUID();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftClosureRepository.existsByShift(shift)).thenReturn(false);

        CloseShiftRequest request = closeShiftRequest("103.00", "0.00", null);

        // Act + Assert
        assertThatThrownBy(() -> shiftService.closeShift(shiftId, staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("User is inactive");

        verify(shiftClosureRepository, never()).save(any(ShiftClosure.class));
    }
}
