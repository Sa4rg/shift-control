package com.shiftcontrol.backend.sales.service;

import com.shiftcontrol.backend.sales.dto.CreateSaleDiscountRequest;
import com.shiftcontrol.backend.sales.dto.CreateSaleItemRequest;
import com.shiftcontrol.backend.sales.dto.CreateSalePaymentRequest;
import com.shiftcontrol.backend.sales.dto.CreateSaleRequest;
import com.shiftcontrol.backend.sales.dto.CancelSaleRequest;
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
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SaleService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final BigDecimal LOYALTY_CARD_MINIMUM_SUBTOTAL = new BigDecimal("25.00");
    private static final BigDecimal LOYALTY_CARD_DISCOUNT_AMOUNT = new BigDecimal("20.00");
    private static final BigDecimal VOUCHER_PERCENTAGE = new BigDecimal("10.00");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100.00");

    private final SaleRepository saleRepository;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;

    public SaleService(
            SaleRepository saleRepository,
            UserRepository userRepository,
            ShiftRepository shiftRepository
    ) {
        this.saleRepository = saleRepository;
        this.userRepository = userRepository;
        this.shiftRepository = shiftRepository;
    }

    @Transactional
    public Sale createSale(UUID authenticatedUserId, CreateSaleRequest request) {
        User staff = userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (staff.getRole() != Role.STAFF) {
            throw new BusinessException("Only staff users can create sales");
        }

        if (!staff.isActive()) {
            throw new BusinessException("User is inactive");
        }

        Shift shift = shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)
                .orElseThrow(() -> new BusinessException("Staff has no open shift"));

        BigDecimal subtotal = calculateSubtotal(request.items());
        List<CreateSaleDiscountRequest> discountRequests = request.discounts() == null
                ? List.of()
                : request.discounts();

        BigDecimal discountTotal = calculateDiscountTotal(subtotal, discountRequests);
        BigDecimal finalTotal = subtotal.subtract(discountTotal).setScale(2, RoundingMode.HALF_UP);

        if (finalTotal.compareTo(ZERO) <= 0) {
            throw new BusinessException("Sale final total must be greater than zero");
        }

        BigDecimal paymentTotal = calculatePaymentTotal(request.payments());

        if (paymentTotal.compareTo(finalTotal) != 0) {
            throw new BusinessException("Payment total must match sale final total");
        }

        Instant now = Instant.now();

        Sale sale = new Sale();
        sale.setShift(shift);
        sale.setStaff(staff);
        sale.setStore(staff.getStore());
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(request.invoiceStatus());
        sale.setSubtotalAmount(subtotal);
        sale.setDiscountTotalAmount(discountTotal);
        sale.setFinalTotalAmount(finalTotal);
        sale.setNote(normalizeNullableText(request.note()));
        sale.setCancelledReason(null);
        sale.setCreatedAt(now);
        sale.setUpdatedAt(now);
        sale.setCancelledAt(null);

        for (CreateSaleItemRequest itemRequest : request.items()) {
            SaleItem item = new SaleItem();
            item.setProductName(itemRequest.productName().trim());
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(toMoney(itemRequest.unitPrice()));
            item.setLineTotal(calculateLineTotal(itemRequest));
            sale.addItem(item);
        }

        for (CreateSaleDiscountRequest discountRequest : discountRequests) {
            SaleDiscount discount = buildDiscount(subtotal, discountRequest);
            sale.addDiscount(discount);
        }

        for (CreateSalePaymentRequest paymentRequest : request.payments()) {
            SalePayment payment = new SalePayment();
            payment.setMethod(paymentRequest.method());
            payment.setAmount(toMoney(paymentRequest.amount()));
            sale.addPayment(payment);
        }

        return saleRepository.save(sale);
    }

    private BigDecimal calculateSubtotal(List<CreateSaleItemRequest> items) {
        return items.stream()
                .map(this::calculateLineTotal)
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateLineTotal(CreateSaleItemRequest item) {
        return toMoney(item.unitPrice())
                .multiply(BigDecimal.valueOf(item.quantity()))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateDiscountTotal(
            BigDecimal subtotal,
            List<CreateSaleDiscountRequest> discounts
    ) {
        return discounts.stream()
                .map(discount -> buildDiscount(subtotal, discount).getAmountApplied())
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private SaleDiscount buildDiscount(BigDecimal subtotal, CreateSaleDiscountRequest request) {
        if (request.reason() == null) {
            throw new BusinessException("Discount reason is required");
        }

        SaleDiscount discount = new SaleDiscount();
        discount.setReason(request.reason());
        discount.setNote(normalizeNullableText(request.note()));

        if (request.reason() == DiscountReason.LOYALTY_CARD) {
            if (subtotal.compareTo(LOYALTY_CARD_MINIMUM_SUBTOTAL) < 0) {
                throw new BusinessException("Loyalty card discount requires subtotal of at least 25.00");
            }

            discount.setType(DiscountType.FIXED_AMOUNT);
            discount.setValue(LOYALTY_CARD_DISCOUNT_AMOUNT);
            discount.setAmountApplied(LOYALTY_CARD_DISCOUNT_AMOUNT);
            return discount;
        }

        if (request.reason() == DiscountReason.VOUCHER_10_PERCENT) {
            BigDecimal amountApplied = subtotal
                    .multiply(VOUCHER_PERCENTAGE)
                    .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);

            discount.setType(DiscountType.PERCENTAGE);
            discount.setValue(VOUCHER_PERCENTAGE);
            discount.setAmountApplied(amountApplied);
            return discount;
        }

        if (request.reason() == DiscountReason.MANUAL_DISCOUNT) {
            if (request.amount() == null || request.amount().compareTo(ZERO) <= 0) {
                throw new BusinessException("Manual discount amount must be greater than zero");
            }
            if (request.amount().compareTo(subtotal) >= 0) {
                throw new BusinessException("Manual discount amount must be less than sale subtotal");
            }
            if (request.note() == null || request.note().isBlank()) {
                throw new BusinessException("Manual discount requires a note");
            }
            BigDecimal amount = toMoney(request.amount());
            discount.setType(DiscountType.FIXED_AMOUNT);
            discount.setValue(amount);
            discount.setAmountApplied(amount);
            return discount;
        }

        throw new BusinessException("Unsupported discount reason");
    }

    private BigDecimal calculatePaymentTotal(List<CreateSalePaymentRequest> payments) {
        return payments.stream()
                .map(payment -> toMoney(payment.amount()))
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal toMoney(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeNullableText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    @Transactional(readOnly = true)
    public Sale getById(UUID id, UUID authenticatedUserId, Role authenticatedRole) {
        Sale sale = saleRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Sale not found"));
        Hibernate.initialize(sale.getItems());
        Hibernate.initialize(sale.getDiscounts());
        Hibernate.initialize(sale.getPayments());
        if (authenticatedRole != Role.ADMIN
                && !sale.getStaff().getId().equals(authenticatedUserId)) {
            throw new BusinessException("You are not allowed to access this sale");
        }
        return sale;
    }

    @Transactional(readOnly = true)
    public List<Sale> listSales(String shiftId, UUID authenticatedUserId, Role authenticatedRole) {
        if (shiftId == null || shiftId.isBlank()) {
            throw new BusinessException("shiftId is required");
        }

        if ("current".equalsIgnoreCase(shiftId)) {
            return listCurrentShiftSales(authenticatedUserId);
        }

        UUID shiftUuid;
        try {
            shiftUuid = UUID.fromString(shiftId);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid shiftId");
        }

        Shift shift = shiftRepository.findByIdWithDetails(shiftUuid)
                .orElseThrow(() -> new NotFoundException("Shift not found"));

        if (authenticatedRole != Role.ADMIN && !shift.getStaff().getId().equals(authenticatedUserId)) {
            throw new BusinessException("You are not allowed to access this shift");
        }

        List<Sale> sales = saleRepository.findByShiftOrderByCreatedAtDesc(shift);

        for (Sale sale : sales) {
            Hibernate.initialize(sale.getItems());
            Hibernate.initialize(sale.getDiscounts());
            Hibernate.initialize(sale.getPayments());
            Hibernate.initialize(sale.getShift());
            Hibernate.initialize(sale.getStaff());
            Hibernate.initialize(sale.getStore());
        }

        return sales;
    }

    @Transactional(readOnly = true)
    public List<Sale> listCurrentShiftSales(UUID authenticatedUserId) {
        User staff = userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (staff.getRole() != Role.STAFF) {
            throw new BusinessException("Only staff users can query current shift sales");
        }

        if (!staff.isActive()) {
            throw new BusinessException("User is inactive");
        }

        Shift shift = shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)
                .orElseThrow(() -> new BusinessException("Staff has no open shift"));

        List<Sale> sales = saleRepository.findByShiftOrderByCreatedAtDesc(shift);

        for (Sale sale : sales) {
            Hibernate.initialize(sale.getItems());
            Hibernate.initialize(sale.getDiscounts());
            Hibernate.initialize(sale.getPayments());
            Hibernate.initialize(sale.getShift());
            Hibernate.initialize(sale.getStaff());
            Hibernate.initialize(sale.getStore());
        }

        return sales;
    }

    @Transactional
    public Sale markAsInvoiced(UUID id, UUID authenticatedUserId, Role authenticatedRole) {
        Sale sale = saleRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Sale not found"));

        Hibernate.initialize(sale.getItems());
        Hibernate.initialize(sale.getDiscounts());
        Hibernate.initialize(sale.getPayments());

        if (authenticatedRole != Role.ADMIN
                && !sale.getStaff().getId().equals(authenticatedUserId)) {
            throw new BusinessException("You are not allowed to access this sale");
        }

        if (sale.getStatus() == SaleStatus.CANCELLED) {
            throw new BusinessException("Cancelled sale cannot be invoiced");
        }

        if (sale.getInvoiceStatus() == InvoiceStatus.INVOICED) {
            throw new BusinessException("Sale is already invoiced");
        }

        sale.setInvoiceStatus(InvoiceStatus.INVOICED);
        sale.setUpdatedAt(Instant.now());

        return saleRepository.save(sale);
    }

    @Transactional
    public Sale cancelSale(UUID id, CancelSaleRequest request, UUID authenticatedUserId, Role authenticatedRole) {
        Sale sale = saleRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Sale not found"));

        Hibernate.initialize(sale.getItems());
        Hibernate.initialize(sale.getDiscounts());
        Hibernate.initialize(sale.getPayments());

        if (authenticatedRole != Role.ADMIN
                && !sale.getStaff().getId().equals(authenticatedUserId)) {
            throw new BusinessException("You are not allowed to access this sale");
        }

        User cancelledBy = userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (sale.getStatus() == SaleStatus.CANCELLED) {
            throw new BusinessException("Sale is already cancelled");
        }

        if (sale.getShift().getStatus() == ShiftStatus.CLOSED) {
            throw new BusinessException("Closed shift sale cannot be cancelled");
        }

        Instant now = Instant.now();

        sale.setStatus(SaleStatus.CANCELLED);
        sale.setCancelledReason(request.reason().trim());
        sale.setCancelledBy(cancelledBy);
        sale.setCancelledAt(now);
        sale.setUpdatedAt(now);

        return saleRepository.save(sale);
    }
}