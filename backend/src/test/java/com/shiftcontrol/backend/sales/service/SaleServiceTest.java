package com.shiftcontrol.backend.sales.service;

import com.shiftcontrol.backend.sales.dto.CancelSaleRequest;
import com.shiftcontrol.backend.sales.dto.CreateSaleDiscountRequest;
import com.shiftcontrol.backend.sales.dto.CreateSaleItemRequest;
import com.shiftcontrol.backend.sales.dto.CreateSalePaymentRequest;
import com.shiftcontrol.backend.sales.dto.CreateSaleRequest;
import com.shiftcontrol.backend.sales.model.DiscountReason;
import com.shiftcontrol.backend.sales.model.DiscountType;
import com.shiftcontrol.backend.sales.model.InvoiceStatus;
import com.shiftcontrol.backend.sales.model.PaymentMethod;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SaleDiscount;
import com.shiftcontrol.backend.sales.model.SaleItem;
import com.shiftcontrol.backend.sales.model.SalePayment;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.sales.repository.SaleRepository;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.model.ShiftType;import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
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
import java.time.Instant;
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
class SaleServiceTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShiftRepository shiftRepository;

    @InjectMocks
    private SaleService saleService;

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store activeStore() {
        Store store = new Store();
        store.setName("São Bento");
        store.setActive(true);
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

    private Shift openShiftFor(User staff, Store store) {
        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(store);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.OPEN);
        shift.setOpenedAt(Instant.now());
        shift.setCreatedAt(Instant.now());
        shift.setUpdatedAt(Instant.now());
        return shift;
    }

    private CreateSaleRequest requestWithoutDiscounts(
            String productName, int quantity, String unitPrice,
            PaymentMethod paymentMethod, String paymentAmount
    ) {
        return new CreateSaleRequest(
                List.of(new CreateSaleItemRequest(productName, quantity, new BigDecimal(unitPrice))),
                List.of(),
                List.of(new CreateSalePaymentRequest(paymentMethod, new BigDecimal(paymentAmount))),
                InvoiceStatus.PENDING,
                "Test sale"
        );
    }

    private CreateSalePaymentRequest cashPayment(String amount) {
        return new CreateSalePaymentRequest(PaymentMethod.CASH, new BigDecimal(amount));
    }

    // -------------------------------------------------------------------------
    // createSale tests
    // -------------------------------------------------------------------------

    @Test
    void should_create_sale_without_discounts_when_payment_matches_total() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateSaleRequest request = requestWithoutDiscounts("Product A", 2, "10.00", PaymentMethod.CASH, "20.00");

        // Act
        Sale sale = saleService.createSale(staffId, request);

        // Assert
        assertThat(sale.getStatus()).isEqualTo(SaleStatus.ACTIVE);
        assertThat(sale.getInvoiceStatus()).isEqualTo(InvoiceStatus.PENDING);
        assertThat(sale.getSubtotalAmount()).isEqualByComparingTo("20.00");
        assertThat(sale.getDiscountTotalAmount()).isEqualByComparingTo("0.00");
        assertThat(sale.getFinalTotalAmount()).isEqualByComparingTo("20.00");

        assertThat(sale.getItems()).hasSize(1);
        SaleItem item = sale.getItems().get(0);
        assertThat(item.getLineTotal()).isEqualByComparingTo("20.00");

        assertThat(sale.getPayments()).hasSize(1);
        SalePayment payment = sale.getPayments().get(0);
        assertThat(payment.getAmount()).isEqualByComparingTo("20.00");

        assertThat(sale.getDiscounts()).isEmpty();

        assertThat(sale.getStaff()).isSameAs(staff);
        assertThat(sale.getStore()).isSameAs(store);
        assertThat(sale.getShift()).isSameAs(shift);

        assertThat(sale.getCreatedAt()).isNotNull();
        assertThat(sale.getUpdatedAt()).isNotNull();

        verify(saleRepository).save(any(Sale.class));
    }

    @Test
    void should_create_sale_with_loyalty_card_discount_when_subtotal_is_at_least_25() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("25.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.LOYALTY_CARD, null, null)),
                List.of(cashPayment("5.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act
        Sale sale = saleService.createSale(staffId, request);

        // Assert
        assertThat(sale.getSubtotalAmount()).isEqualByComparingTo("25.00");
        assertThat(sale.getDiscountTotalAmount()).isEqualByComparingTo("20.00");
        assertThat(sale.getFinalTotalAmount()).isEqualByComparingTo("5.00");

        assertThat(sale.getDiscounts()).hasSize(1);
        SaleDiscount discount = sale.getDiscounts().get(0);
        assertThat(discount.getType()).isEqualTo(DiscountType.FIXED_AMOUNT);
        assertThat(discount.getReason()).isEqualTo(DiscountReason.LOYALTY_CARD);
        assertThat(discount.getValue()).isEqualByComparingTo("20.00");
        assertThat(discount.getAmountApplied()).isEqualByComparingTo("20.00");
    }

    @Test
    void should_throw_when_loyalty_card_discount_subtotal_is_less_than_25() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("20.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.LOYALTY_CARD, null, null)),
                List.of(cashPayment("20.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Loyalty card discount requires subtotal of at least 25.00");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_create_sale_with_voucher_10_percent_discount() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("100.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.VOUCHER_10_PERCENT, null, null)),
                List.of(new CreateSalePaymentRequest(PaymentMethod.MB, new BigDecimal("90.00"))),
                InvoiceStatus.PENDING,
                null
        );

        // Act
        Sale sale = saleService.createSale(staffId, request);

        // Assert
        assertThat(sale.getSubtotalAmount()).isEqualByComparingTo("100.00");
        assertThat(sale.getDiscountTotalAmount()).isEqualByComparingTo("10.00");
        assertThat(sale.getFinalTotalAmount()).isEqualByComparingTo("90.00");

        assertThat(sale.getDiscounts()).hasSize(1);
        SaleDiscount discount = sale.getDiscounts().get(0);
        assertThat(discount.getType()).isEqualTo(DiscountType.PERCENTAGE);
        assertThat(discount.getReason()).isEqualTo(DiscountReason.VOUCHER_10_PERCENT);
        assertThat(discount.getValue()).isEqualByComparingTo("10.00");
        assertThat(discount.getAmountApplied()).isEqualByComparingTo("10.00");
    }

    @Test
    void should_throw_when_payment_total_does_not_match_final_total() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = requestWithoutDiscounts("Product A", 1, "20.00", PaymentMethod.CASH, "19.00");

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Payment total must match sale final total");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_authenticated_user_not_found() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        CreateSaleRequest request = requestWithoutDiscounts("Product A", 1, "20.00", PaymentMethod.CASH, "20.00");

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(userId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_authenticated_user_is_not_staff() {
        // Arrange
        User admin = adminUser();
        UUID adminId = admin.getId();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        CreateSaleRequest request = requestWithoutDiscounts("Product A", 1, "20.00", PaymentMethod.CASH, "20.00");

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only staff users can create sales");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_staff_is_inactive() {
        // Arrange
        Store store = activeStore();
        User staff = inactiveStaffWithStore(store);
        UUID staffId = staff.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        CreateSaleRequest request = requestWithoutDiscounts("Product A", 1, "20.00", PaymentMethod.CASH, "20.00");

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("User is inactive");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_staff_has_no_open_shift() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.empty());

        CreateSaleRequest request = requestWithoutDiscounts("Product A", 1, "20.00", PaymentMethod.CASH, "20.00");

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Staff has no open shift");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_discount_reason_is_null() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("30.00"))),
                List.of(new CreateSaleDiscountRequest(null, null, null)),
                List.of(cashPayment("30.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Discount reason is required");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_create_sale_with_manual_discount_fixed_amount() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("30.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.MANUAL_DISCOUNT, new BigDecimal("5.00"), "  Manager approved  ")),
                List.of(cashPayment("25.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act
        Sale sale = saleService.createSale(staffId, request);

        // Assert
        assertThat(sale.getSubtotalAmount()).isEqualByComparingTo("30.00");
        assertThat(sale.getDiscountTotalAmount()).isEqualByComparingTo("5.00");
        assertThat(sale.getFinalTotalAmount()).isEqualByComparingTo("25.00");
        assertThat(sale.getDiscounts()).hasSize(1);
        SaleDiscount discount = sale.getDiscounts().get(0);
        assertThat(discount.getType()).isEqualTo(DiscountType.FIXED_AMOUNT);
        assertThat(discount.getReason()).isEqualTo(DiscountReason.MANUAL_DISCOUNT);
        assertThat(discount.getValue()).isEqualByComparingTo("5.00");
        assertThat(discount.getAmountApplied()).isEqualByComparingTo("5.00");
        assertThat(discount.getNote()).isEqualTo("Manager approved");
    }

    @Test
    void should_throw_when_manual_discount_amount_is_null() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("30.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.MANUAL_DISCOUNT, null, "Approved")),
                List.of(cashPayment("30.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Manual discount amount must be greater than zero");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_manual_discount_amount_is_zero() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("30.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.MANUAL_DISCOUNT, BigDecimal.ZERO, "Approved")),
                List.of(cashPayment("30.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Manual discount amount must be greater than zero");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_manual_discount_amount_exceeds_subtotal() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("30.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.MANUAL_DISCOUNT, new BigDecimal("35.00"), "Approved")),
                List.of(cashPayment("30.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Manual discount amount must be less than sale subtotal");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_manual_discount_amount_equals_subtotal() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("30.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.MANUAL_DISCOUNT, new BigDecimal("30.00"), "Approved")),
                List.of(cashPayment("30.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Manual discount amount must be less than sale subtotal");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_manual_discount_note_is_null() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("30.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.MANUAL_DISCOUNT, new BigDecimal("5.00"), null)),
                List.of(cashPayment("30.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Manual discount requires a note");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_manual_discount_note_is_blank() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("30.00"))),
                List.of(new CreateSaleDiscountRequest(DiscountReason.MANUAL_DISCOUNT, new BigDecimal("5.00"), "   ")),
                List.of(cashPayment("30.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act + Assert
        assertThatThrownBy(() -> saleService.createSale(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Manual discount requires a note");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_create_sale_combining_loyalty_card_and_manual_discount() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("50.00"))),
                List.of(
                        new CreateSaleDiscountRequest(DiscountReason.LOYALTY_CARD, null, null),
                        new CreateSaleDiscountRequest(DiscountReason.MANUAL_DISCOUNT, new BigDecimal("5.00"), "Extra discount")
                ),
                List.of(cashPayment("25.00")),
                InvoiceStatus.PENDING,
                null
        );

        // Act
        Sale sale = saleService.createSale(staffId, request);

        // Assert
        assertThat(sale.getSubtotalAmount()).isEqualByComparingTo("50.00");
        assertThat(sale.getDiscountTotalAmount()).isEqualByComparingTo("25.00"); // 20 + 5
        assertThat(sale.getFinalTotalAmount()).isEqualByComparingTo("25.00");
        assertThat(sale.getDiscounts()).hasSize(2);
    }

    @Test
    void should_normalize_product_name_and_note() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateSaleRequest request = new CreateSaleRequest(
                List.of(new CreateSaleItemRequest("  Product A  ", 1, new BigDecimal("20.00"))),
                List.of(),
                List.of(cashPayment("20.00")),
                InvoiceStatus.PENDING,
                "  Sale note  "
        );

        // Act
        Sale sale = saleService.createSale(staffId, request);

        // Assert
        assertThat(sale.getItems().get(0).getProductName()).isEqualTo("Product A");
        assertThat(sale.getNote()).isEqualTo("Sale note");
    }

    // -------------------------------------------------------------------------
    // getById tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_sale_by_id_for_admin() {
        // Arrange
        Store store = activeStore();
        User admin = adminUser();
        Sale sale = new Sale();
        User saleOwner = activeStaffWithStore(store);
        sale.setStaff(saleOwner);
        UUID saleId = UUID.randomUUID();
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));

        // Act
        Sale result = saleService.getById(saleId, admin.getId(), Role.ADMIN);

        // Assert
        assertThat(result).isSameAs(sale);
        verify(saleRepository).findWithDetailsById(saleId);
    }

    @Test
    void should_return_sale_by_id_for_owner_staff() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        Sale sale = new Sale();
        sale.setStaff(staff);
        UUID saleId = UUID.randomUUID();
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));

        // Act
        Sale result = saleService.getById(saleId, staff.getId(), Role.STAFF);

        // Assert
        assertThat(result).isSameAs(sale);
    }

    @Test
    void should_throw_when_staff_accesses_other_staff_sale() {
        // Arrange
        Store store = activeStore();
        User owner = activeStaffWithStore(store);
        User otherStaff = activeStaffWithStore(store);
        Sale sale = new Sale();
        sale.setStaff(owner);
        UUID saleId = UUID.randomUUID();
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));

        // Act + Assert
        assertThatThrownBy(() -> saleService.getById(saleId, otherStaff.getId(), Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("You are not allowed to access this sale");
    }

    @Test
    void should_throw_not_found_when_sale_id_does_not_exist() {
        // Arrange
        UUID saleId = UUID.randomUUID();
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> saleService.getById(saleId, UUID.randomUUID(), Role.ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Sale not found");

        verify(saleRepository).findWithDetailsById(saleId);
    }

    // -------------------------------------------------------------------------
    // listCurrentShiftSales tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_current_shift_sales_for_active_staff() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        Shift shift = openShiftFor(staff, store);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));

        List<Sale> sales = List.of(new Sale(), new Sale());
        when(saleRepository.findByShiftOrderByCreatedAtDesc(shift)).thenReturn(sales);

        // Act
        List<Sale> result = saleService.listCurrentShiftSales(staffId);

        // Assert
        assertThat(result).isSameAs(sales);
        verify(saleRepository).findByShiftOrderByCreatedAtDesc(shift);
    }

    @Test
    void should_throw_when_current_shift_sales_user_not_found() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> saleService.listCurrentShiftSales(userId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void should_throw_when_admin_queries_current_shift_sales() {
        // Arrange
        User admin = adminUser();
        UUID adminId = admin.getId();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        // Act + Assert
        assertThatThrownBy(() -> saleService.listCurrentShiftSales(adminId))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only staff users can query current shift sales");
    }

    @Test
    void should_throw_when_inactive_staff_queries_current_shift_sales() {
        // Arrange
        Store store = activeStore();
        User staff = inactiveStaffWithStore(store);
        UUID staffId = staff.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        // Act + Assert
        assertThatThrownBy(() -> saleService.listCurrentShiftSales(staffId))
                .isInstanceOf(BusinessException.class)
                .hasMessage("User is inactive");
    }

    @Test
    void should_throw_when_staff_has_no_open_shift_for_current_shift_sales() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID staffId = staff.getId();
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> saleService.listCurrentShiftSales(staffId))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Staff has no open shift");
    }

    // -------------------------------------------------------------------------
    // listSales tests (UUID-based)
    // -------------------------------------------------------------------------

    @Test
    void should_list_sales_by_shift_id_for_admin() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        User admin = adminUser();
        Shift shift = openShiftFor(staff, store);
        UUID shiftId = UUID.randomUUID();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        List<Sale> sales = List.of(new Sale(), new Sale());
        when(saleRepository.findByShiftOrderByCreatedAtDesc(shift)).thenReturn(sales);

        // Act
        List<Sale> result = saleService.listSales(shiftId.toString(), admin.getId(), Role.ADMIN);

        // Assert
        assertThat(result).isSameAs(sales);
        verify(saleRepository).findByShiftOrderByCreatedAtDesc(shift);
    }

    @Test
    void should_list_sales_by_shift_id_for_owner_staff() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        Shift shift = openShiftFor(staff, store);
        UUID shiftId = UUID.randomUUID();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        List<Sale> sales = List.of(new Sale());
        when(saleRepository.findByShiftOrderByCreatedAtDesc(shift)).thenReturn(sales);

        // Act
        List<Sale> result = saleService.listSales(shiftId.toString(), staff.getId(), Role.STAFF);

        // Assert
        assertThat(result).isSameAs(sales);
        verify(saleRepository).findByShiftOrderByCreatedAtDesc(shift);
    }

    @Test
    void should_throw_when_staff_lists_sales_for_other_staff_shift() {
        // Arrange
        Store store = activeStore();
        User owner = activeStaffWithStore(store);
        User otherStaff = new User();
        otherStaff.setId(UUID.randomUUID());
        otherStaff.setRole(Role.STAFF);
        otherStaff.setActive(true);
        otherStaff.setStore(store);
        Shift shift = openShiftFor(owner, store);
        UUID shiftId = UUID.randomUUID();

        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));

        // Act + Assert
        assertThatThrownBy(() -> saleService.listSales(shiftId.toString(), otherStaff.getId(), Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("You are not allowed to access this shift");

        verify(saleRepository, never()).findByShiftOrderByCreatedAtDesc(any(Shift.class));
    }

    @Test
    void should_throw_when_sales_shift_id_is_missing() {
        // Act + Assert
        assertThatThrownBy(() -> saleService.listSales(null, UUID.randomUUID(), Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("shiftId is required");
    }

    @Test
    void should_throw_when_sales_shift_id_is_blank() {
        // Act + Assert
        assertThatThrownBy(() -> saleService.listSales("   ", UUID.randomUUID(), Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("shiftId is required");
    }

    @Test
    void should_throw_when_sales_shift_id_is_invalid() {
        // Act + Assert
        assertThatThrownBy(() -> saleService.listSales("not-a-uuid", UUID.randomUUID(), Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Invalid shiftId");
    }

    @Test
    void should_throw_when_sales_shift_does_not_exist() {
        // Arrange
        UUID shiftId = UUID.randomUUID();
        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> saleService.listSales(shiftId.toString(), UUID.randomUUID(), Role.ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Shift not found");

        verify(saleRepository, never()).findByShiftOrderByCreatedAtDesc(any(Shift.class));
    }

    // -------------------------------------------------------------------------
    // markAsInvoiced tests
    // -------------------------------------------------------------------------

    @Test
    void should_mark_sale_as_invoiced_for_owner_staff() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStaff(staff);
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(InvoiceStatus.PENDING);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));
        when(saleRepository.save(sale)).thenReturn(sale);

        // Act
        Sale result = saleService.markAsInvoiced(saleId, staff.getId(), Role.STAFF);

        // Assert
        assertThat(result.getInvoiceStatus()).isEqualTo(InvoiceStatus.INVOICED);
        assertThat(result.getUpdatedAt()).isNotNull();
        verify(saleRepository).save(sale);
    }

    @Test
    void should_throw_when_staff_marks_other_staff_sale_as_invoiced() {
        // Arrange
        Store store = activeStore();
        User owner = activeStaffWithStore(store);
        User otherStaff = activeStaffWithStore(store);
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStaff(owner);
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(InvoiceStatus.PENDING);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));

        // Act + Assert
        assertThatThrownBy(() -> saleService.markAsInvoiced(saleId, otherStaff.getId(), Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("You are not allowed to access this sale");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_not_found_when_marking_missing_sale_as_invoiced() {
        // Arrange
        UUID saleId = UUID.randomUUID();
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> saleService.markAsInvoiced(saleId, UUID.randomUUID(), Role.ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Sale not found");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_cancelled_sale_is_marked_as_invoiced() {
        // Arrange
        User admin = adminUser();
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStatus(SaleStatus.CANCELLED);
        sale.setInvoiceStatus(InvoiceStatus.PENDING);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));

        // Act + Assert
        assertThatThrownBy(() -> saleService.markAsInvoiced(saleId, admin.getId(), Role.ADMIN))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Cancelled sale cannot be invoiced");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_sale_is_already_invoiced() {
        // Arrange
        User admin = adminUser();
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(InvoiceStatus.INVOICED);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));

        // Act + Assert
        assertThatThrownBy(() -> saleService.markAsInvoiced(saleId, admin.getId(), Role.ADMIN))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sale is already invoiced");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    // -------------------------------------------------------------------------
    // cancelSale tests
    // -------------------------------------------------------------------------

    @Test
    void should_cancel_sale_for_owner_staff_when_shift_is_open() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        Shift openShift = openShiftFor(staff, store);
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStaff(staff);
        sale.setShift(openShift);
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(InvoiceStatus.PENDING);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));
        when(userRepository.findById(staff.getId())).thenReturn(Optional.of(staff));
        when(saleRepository.save(any(Sale.class))).thenAnswer(inv -> inv.getArgument(0));

        CancelSaleRequest request = new CancelSaleRequest("  Customer mistake  ");

        // Act
        saleService.cancelSale(saleId, request, staff.getId(), Role.STAFF);

        // Assert
        assertThat(sale.getStatus()).isEqualTo(SaleStatus.CANCELLED);
        assertThat(sale.getCancelledReason()).isEqualTo("Customer mistake");
        assertThat(sale.getCancelledAt()).isNotNull();
        assertThat(sale.getUpdatedAt()).isNotNull();
        assertThat(sale.getCancelledBy()).isSameAs(staff);
        verify(saleRepository).save(sale);
    }

    @Test
    void should_cancel_sale_for_admin_and_set_cancelled_by() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        User admin = adminUser();
        Shift openShift = openShiftFor(staff, store);
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStaff(staff);
        sale.setShift(openShift);
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(InvoiceStatus.PENDING);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(saleRepository.save(any(Sale.class))).thenAnswer(inv -> inv.getArgument(0));

        CancelSaleRequest request = new CancelSaleRequest("  Admin override  ");

        // Act
        saleService.cancelSale(saleId, request, admin.getId(), Role.ADMIN);

        // Assert
        assertThat(sale.getStatus()).isEqualTo(SaleStatus.CANCELLED);
        assertThat(sale.getCancelledReason()).isEqualTo("Admin override");
        assertThat(sale.getCancelledAt()).isNotNull();
        assertThat(sale.getUpdatedAt()).isNotNull();
        assertThat(sale.getCancelledBy()).isSameAs(admin);
        verify(saleRepository).save(sale);
    }

    @Test
    void should_throw_when_staff_cancels_other_staff_sale() {
        // Arrange
        Store store = activeStore();
        User owner = activeStaffWithStore(store);
        User otherStaff = activeStaffWithStore(store);
        Shift openShift = openShiftFor(owner, store);
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStaff(owner);
        sale.setShift(openShift);
        sale.setStatus(SaleStatus.ACTIVE);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));

        CancelSaleRequest request = new CancelSaleRequest("Trying to cancel");

        // Act + Assert
        assertThatThrownBy(() -> saleService.cancelSale(saleId, request, otherStaff.getId(), Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("You are not allowed to access this sale");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_cancelling_sale_from_closed_shift() {
        // Arrange
        Store store = activeStore();
        User staff = activeStaffWithStore(store);
        Shift closedShift = new Shift();
        closedShift.setStaff(staff);
        closedShift.setStore(store);
        closedShift.setStatus(ShiftStatus.CLOSED);
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStaff(staff);
        sale.setShift(closedShift);
        sale.setStatus(SaleStatus.ACTIVE);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));
        when(userRepository.findById(staff.getId())).thenReturn(Optional.of(staff));

        CancelSaleRequest request = new CancelSaleRequest("Cancel attempt");

        // Act + Assert
        assertThatThrownBy(() -> saleService.cancelSale(saleId, request, staff.getId(), Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Closed shift sale cannot be cancelled");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_not_found_when_cancelling_missing_sale() {
        // Arrange
        UUID saleId = UUID.randomUUID();
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.empty());

        CancelSaleRequest request = new CancelSaleRequest("Some reason");

        // Act + Assert
        assertThatThrownBy(() -> saleService.cancelSale(saleId, request, UUID.randomUUID(), Role.ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Sale not found");

        verify(saleRepository, never()).save(any(Sale.class));
    }

    @Test
    void should_throw_when_sale_is_already_cancelled() {
        // Arrange
        User admin = adminUser();
        UUID saleId = UUID.randomUUID();
        Sale sale = new Sale();
        sale.setStatus(SaleStatus.CANCELLED);
        when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

        CancelSaleRequest request = new CancelSaleRequest("Some reason");

        // Act + Assert
        assertThatThrownBy(() -> saleService.cancelSale(saleId, request, admin.getId(), Role.ADMIN))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sale is already cancelled");

        verify(saleRepository, never()).save(any(Sale.class));
    }
}
