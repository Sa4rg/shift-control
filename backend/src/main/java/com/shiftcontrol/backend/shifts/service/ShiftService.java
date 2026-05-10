package com.shiftcontrol.backend.shifts.service;

import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.sales.repository.SaleRepository;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.dto.OpenShiftRequest;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.shiftcontrol.backend.closures.dto.CloseShiftRequest;
import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.sales.model.InvoiceStatus;
import com.shiftcontrol.backend.sales.model.PaymentMethod;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SalePayment;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import org.hibernate.Hibernate;

import java.math.RoundingMode;


@Service
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final ShiftClosureRepository shiftClosureRepository;
    private final SaleRepository saleRepository;

    public ShiftService(
            ShiftRepository shiftRepository,
            UserRepository userRepository,
            ShiftClosureRepository shiftClosureRepository,
            SaleRepository saleRepository
    ) {
        this.shiftRepository = shiftRepository;
        this.userRepository = userRepository;
        this.shiftClosureRepository = shiftClosureRepository;
        this.saleRepository = saleRepository;
    }

    @Transactional
    public Shift openShift(UUID staffId, OpenShiftRequest request) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (staff.getRole() != Role.STAFF) {
            throw new BusinessException("Only staff users can open shifts");
        }

        if (!staff.isActive()) {
            throw new BusinessException("User is inactive");
        }

        if (staff.getStore() == null) {
            throw new BusinessException("Staff user has no store assigned");
        }

        if (!staff.getStore().isActive()) {
            throw new BusinessException("Store is inactive");
        }

        if (shiftRepository.existsByStaffAndStatus(staff, ShiftStatus.OPEN)) {
            throw new BusinessException("Staff already has an open shift");
        }

        Instant now = Instant.now();

        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(staff.getStore());
        shift.setType(request.type());
        shift.setStatus(ShiftStatus.OPEN);
        shift.setOpenedAt(now);
        shift.setClosedAt(null);
        shift.setClosedBy(null);
        shift.setCreatedAt(now);
        shift.setUpdatedAt(now);

        return shiftRepository.save(shift);
    }

    @Transactional(readOnly = true)
    public Shift getCurrentShift(UUID staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (staff.getRole() != Role.STAFF) {
            throw new BusinessException("Only staff users can have current shifts");
        }

        return shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)
                .orElseThrow(() -> new NotFoundException("Open shift not found"));
    }

    @Transactional(readOnly = true)
    public Shift getById(UUID id, UUID authenticatedUserId, Role authenticatedRole) {
        Shift shift = shiftRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("Shift not found"));
        if (authenticatedRole != Role.ADMIN
                && !shift.getStaff().getId().equals(authenticatedUserId)) {
            throw new BusinessException("You are not allowed to access this shift");
        }
        return shift;
    }

    @Transactional(readOnly = true)
    public List<Shift> listShifts(UUID authenticatedUserId, Role authenticatedRole) {
        if (authenticatedRole == Role.ADMIN) {
            return shiftRepository.findAllWithDetails();
        }

        if (authenticatedRole == Role.STAFF) {
            return shiftRepository.findByStaffIdWithDetails(authenticatedUserId);
        }

        throw new BusinessException("Invalid user role");
    }

    @Transactional
    public ShiftClosure closeShift(UUID shiftId, UUID closedByUserId, CloseShiftRequest request) {
        Shift shift = shiftRepository.findByIdWithDetails(shiftId)
                .orElseThrow(() -> new NotFoundException("Shift not found"));

        User closedBy = userRepository.findById(closedByUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (shift.getStatus() == ShiftStatus.CLOSED) {
            throw new BusinessException("Shift is already closed");
        }

        if (shiftClosureRepository.existsByShift(shift)) {
            throw new BusinessException("Shift closure already exists");
        }

        boolean isShiftOwner = shift.getStaff().getId().equals(closedBy.getId());
        boolean isAdmin = closedBy.getRole() == Role.ADMIN;

        if (!isShiftOwner && !isAdmin) {
            throw new BusinessException("Only shift owner or admin can close shift");
        }

        if (!closedBy.isActive()) {
            throw new BusinessException("User is inactive");
        }

        List<Sale> activeSales = saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE);

        for (Sale sale : activeSales) {
            Hibernate.initialize(sale.getPayments());
        }

        BigDecimal totalCash = totalByPaymentMethod(activeSales, PaymentMethod.CASH);
        BigDecimal totalMb = totalByPaymentMethod(activeSales, PaymentMethod.MB);
        BigDecimal totalGlovoOnline = totalByPaymentMethod(activeSales, PaymentMethod.GLOVO_ONLINE);
        BigDecimal totalGlovoCash = totalByPaymentMethod(activeSales, PaymentMethod.GLOVO_CASH);

        BigDecimal totalSales = activeSales.stream()
                .map(Sale::getFinalTotalAmount)
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal pendingInvoiceTotal = activeSales.stream()
                .filter(sale -> sale.getInvoiceStatus() == InvoiceStatus.PENDING)
                .map(Sale::getFinalTotalAmount)
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal cashToWithdraw = totalCash.add(totalGlovoCash).setScale(2, RoundingMode.HALF_UP);
        BigDecimal expectedPhysicalCash = shift.getStore()
                .getBaseCashAmount()
                .add(cashToWithdraw)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal confirmedCashAmount = toMoney(request.confirmedCashAmount());
        BigDecimal confirmedMbAmount = toMoney(request.confirmedMbAmount());

        BigDecimal cashDifference = confirmedCashAmount
                .subtract(expectedPhysicalCash)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal mbDifference = confirmedMbAmount
                .subtract(totalMb)
                .setScale(2, RoundingMode.HALF_UP);

        ClosureStatus closureStatus =
                cashDifference.compareTo(ZERO) == 0 && mbDifference.compareTo(ZERO) == 0
                        ? ClosureStatus.CLOSED_OK
                        : ClosureStatus.CLOSED_WITH_INCIDENT;

        Instant now = Instant.now();

        ShiftClosure closure = new ShiftClosure();
        closure.setShift(shift);
        closure.setClosedBy(closedBy);

        closure.setTotalCash(totalCash);
        closure.setTotalMb(totalMb);
        closure.setTotalGlovoOnline(totalGlovoOnline);
        closure.setTotalGlovoCash(totalGlovoCash);
        closure.setTotalSales(totalSales);
        closure.setPendingInvoiceTotal(pendingInvoiceTotal);

        closure.setCashToWithdraw(cashToWithdraw);
        closure.setExpectedPhysicalCash(expectedPhysicalCash);

        closure.setConfirmedCashAmount(confirmedCashAmount);
        closure.setConfirmedMbAmount(confirmedMbAmount);

        closure.setCashDifference(cashDifference);
        closure.setMbDifference(mbDifference);

        closure.setStatus(closureStatus);
        closure.setNote(normalizeNullableText(request.note()));
        closure.setCreatedAt(now);
        closure.setUpdatedAt(now);

        shift.setStatus(ShiftStatus.CLOSED);
        shift.setClosedAt(now);
        shift.setClosedBy(closedBy);
        shift.setUpdatedAt(now);

        return shiftClosureRepository.save(closure);
    }

    private BigDecimal totalByPaymentMethod(List<Sale> sales, PaymentMethod method) {
        return sales.stream()
                .flatMap(sale -> sale.getPayments().stream())
                .filter(payment -> payment.getMethod() == method)
                .map(SalePayment::getAmount)
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
}