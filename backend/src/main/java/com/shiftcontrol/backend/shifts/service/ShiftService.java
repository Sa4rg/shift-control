package com.shiftcontrol.backend.shifts.service;

import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.sales.repository.SaleRepository;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.dto.OpenShiftRequest;
import com.shiftcontrol.backend.shifts.dto.ShiftResponse;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.UUID;
import java.math.RoundingMode;

import com.shiftcontrol.backend.closures.dto.CloseShiftRequest;
import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.sales.model.InvoiceStatus;
import com.shiftcontrol.backend.sales.model.PaymentMethod;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SalePayment;
import com.shiftcontrol.backend.sales.model.SaleStatus;

import org.hibernate.Hibernate;

import com.shiftcontrol.backend.shifts.dto.ShiftClosePreviewResponse;
import com.shiftcontrol.backend.stores.model.Store;

import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentSeverity;
import com.shiftcontrol.backend.incidents.model.IncidentSource;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.model.IncidentType;
import com.shiftcontrol.backend.incidents.repository.IncidentRepository;


@Service
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final ShiftClosureRepository shiftClosureRepository;
    private final SaleRepository saleRepository;

    private final IncidentRepository incidentRepository;

    public ShiftService(
            ShiftRepository shiftRepository,
            UserRepository userRepository,
            ShiftClosureRepository shiftClosureRepository,
            SaleRepository saleRepository,
            IncidentRepository incidentRepository
    ) {
        this.shiftRepository = shiftRepository;
        this.userRepository = userRepository;
        this.shiftClosureRepository = shiftClosureRepository;
        this.saleRepository = saleRepository;
        this.incidentRepository = incidentRepository;   
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

        Store store = staff.getStore();

        String configuredWifiSsid = store.getWifiSsid();
        String reportedWifiSsid = request.wifiSsid().trim();

        if (configuredWifiSsid == null || configuredWifiSsid.isBlank()) {
            throw new BusinessException(
                    "Store Wi-Fi network is not configured"
            );
        }

        if (!configuredWifiSsid.equals(reportedWifiSsid)) {
            throw new BusinessException(
                    "You are not connected to the store Wi-Fi network"
            );
        }

        if (shiftRepository.existsByStaffAndStatus(staff, ShiftStatus.OPEN)) {
            throw new BusinessException("Staff already has an open shift");
        }

        Instant now = Instant.now();

        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(store);
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
    public ShiftResponse getShiftResponse(
            UUID id,
            UUID authenticatedUserId,
            Role authenticatedRole
    ) {
        Shift shift = getById(id, authenticatedUserId, authenticatedRole);

        return toShiftResponse(shift);
    }

    @Transactional(readOnly = true)
    public List<Shift> listShifts(
            UUID authenticatedUserId,
            Role authenticatedRole,
            UUID storeId,
            UUID filterStaffId,
            ShiftStatus status,
            LocalDate from,
            LocalDate to
    ) {
        Instant fromInstant = from != null ? from.atStartOfDay(ZoneOffset.UTC).toInstant() : null;
        Instant toInstant = to != null ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : null;

        UUID effectiveStaffId = authenticatedRole == Role.STAFF ? authenticatedUserId : filterStaffId;

        org.springframework.data.jpa.domain.Specification<com.shiftcontrol.backend.shifts.model.Shift> spec =
                com.shiftcontrol.backend.shifts.repository.ShiftSpecification
                        .withFilters(storeId, effectiveStaffId, status, fromInstant, toInstant);

        List<java.util.UUID> ids = shiftRepository.findAll(spec)
                .stream()
                .map(com.shiftcontrol.backend.shifts.model.Shift::getId)
                .toList();

        if (ids.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return shiftRepository.findAllWithDetailsByIds(ids);
    }

    @Transactional(readOnly = true)
    public List<ShiftResponse> listShiftResponses(
            UUID authenticatedUserId,
            Role authenticatedRole,
            UUID storeId,
            UUID filterStaffId,
            ShiftStatus status,
            LocalDate from,
            LocalDate to
    ) {
        List<Shift> shifts = listShifts(
                authenticatedUserId,
                authenticatedRole,
                storeId,
                filterStaffId,
                status,
                from,
                to
        );

        List<UUID> closedShiftIds = shifts.stream()
                .filter(shift -> shift.getStatus() == ShiftStatus.CLOSED)
                .map(Shift::getId)
                .toList();

        Map<UUID, ShiftClosure> closureByShiftId = closedShiftIds.isEmpty()
                ? Map.of()
                : shiftClosureRepository.findByShift_IdIn(closedShiftIds)
                        .stream()
                        .collect(Collectors.toMap(
                                closure -> closure.getShift().getId(),
                                Function.identity()
                        ));

        Map<UUID, Long> totalIncidentCountsByShiftId = toIncidentCountMap(
                closedShiftIds.isEmpty()
                        ? List.of()
                        : incidentRepository.countByShiftContextIn(closedShiftIds)
        );

        Map<UUID, Long> openIncidentCountsByShiftId = toIncidentCountMap(
                closedShiftIds.isEmpty()
                        ? List.of()
                        : incidentRepository.countByShiftContextAndStatusIn(
                        closedShiftIds,
                        IncidentStatus.OPEN
                )
        );

        return shifts
                .stream()
                .map(shift -> toShiftResponse(
                        shift,
                        closureByShiftId.get(shift.getId()),
                        openIncidentCountsByShiftId.getOrDefault(shift.getId(), 0L),
                        totalIncidentCountsByShiftId.getOrDefault(shift.getId(), 0L)
                ))
                .toList();
    }

    private Map<UUID, Long> toIncidentCountMap(List<IncidentRepository.ShiftIncidentCount> counts) {
        return counts.stream()
                .collect(Collectors.toMap(
                        IncidentRepository.ShiftIncidentCount::getShiftId,
                        IncidentRepository.ShiftIncidentCount::getIncidentCount
                ));
    }

    private ShiftResponse toShiftResponse(Shift shift) {
        ShiftClosure closure = null;
        long openIncidentCount = 0;
        long totalIncidentCount = 0;

        if (shift.getStatus() == ShiftStatus.CLOSED) {
            closure = shiftClosureRepository
                    .findByShift(shift)
                    .orElse(null);

            openIncidentCount = incidentRepository.countByShiftContextAndStatus(
                    shift.getId(),
                    IncidentStatus.OPEN
            );

            totalIncidentCount = incidentRepository.countByShiftContext(
                    shift.getId()
            );
        }

        return ShiftResponse.fromEntity(
                shift,
                closure,
                openIncidentCount,
                totalIncidentCount
        );
    }

    private ShiftResponse toShiftResponse(
            Shift shift,
            ShiftClosure closure,
            long openIncidentCount,
            long totalIncidentCount
    ) {
        if (shift.getStatus() != ShiftStatus.CLOSED) {
            closure = null;
            openIncidentCount = 0;
            totalIncidentCount = 0;
        }

        return ShiftResponse.fromEntity(
                shift,
                closure,
                openIncidentCount,
                totalIncidentCount
        );
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

        if (!isAdmin) {
            Store store = shift.getStore();

            String configuredWifiSsid = store.getWifiSsid();
            String reportedWifiSsid = request.wifiSsid();

            if (configuredWifiSsid == null || configuredWifiSsid.isBlank()) {
                throw new BusinessException(
                        "Store Wi-Fi network is not configured"
                );
            }

            if (reportedWifiSsid == null
                    || reportedWifiSsid.isBlank()
                    || !configuredWifiSsid.equals(reportedWifiSsid.trim())) {
                throw new BusinessException(
                        "You are not connected to the store Wi-Fi network"
                );
            }
        }

        List<Sale> activeSales = saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE);
        ShiftCloseTotals totals = calculateShiftTotals(activeSales, shift.getStore());

        BigDecimal confirmedCashAmount = toMoney(request.confirmedCashAmount());
        BigDecimal confirmedMbAmount = toMoney(request.confirmedMbAmount());

        BigDecimal cashDifference = confirmedCashAmount
                .subtract(totals.expectedPhysicalCash())
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal mbDifference = confirmedMbAmount
                .subtract(totals.totalMb())
                .setScale(2, RoundingMode.HALF_UP);

        ClosureStatus closureStatus =
                cashDifference.compareTo(ZERO) == 0 && mbDifference.compareTo(ZERO) == 0
                        ? ClosureStatus.CLOSED_OK
                        : ClosureStatus.CLOSED_WITH_INCIDENT;

        Instant now = Instant.now();

        ShiftClosure closure = new ShiftClosure();
        closure.setShift(shift);
        closure.setClosedBy(closedBy);

        closure.setTotalCash(totals.totalCash());
        closure.setTotalMb(totals.totalMb());
        closure.setTotalGlovoOnline(totals.totalGlovoOnline());
        closure.setTotalGlovoCash(totals.totalGlovoCash());
        closure.setTotalSales(totals.totalSales());
        closure.setPendingInvoiceTotal(totals.pendingInvoiceTotal());

        closure.setCashToWithdraw(totals.cashToWithdraw());
        closure.setExpectedPhysicalCash(totals.expectedPhysicalCash());

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

        ShiftClosure savedClosure = shiftClosureRepository.save(closure);

        if (cashDifference.compareTo(ZERO) != 0) {
            createAutomaticDifferenceIncident(
                    shift,
                    savedClosure,
                    closedBy,
                    IncidentType.CASH_DIFFERENCE,
                    cashDifference,
                    now
            );
        }

        if (mbDifference.compareTo(ZERO) != 0) {
            createAutomaticDifferenceIncident(
                    shift,
                    savedClosure,
                    closedBy,
                    IncidentType.MB_DIFFERENCE,
                    mbDifference,
                    now
            );
        }

        return savedClosure;
    }

    private void createAutomaticDifferenceIncident(
            Shift shift,
            ShiftClosure closure,
            User reportedBy,
            IncidentType type,
            BigDecimal difference,
            Instant createdAt
    ) {
        Incident incident = new Incident();

        incident.setShift(shift);
        incident.setClosure(closure);
        incident.setSale(null);

        incident.setReportedBy(reportedBy);
        incident.setResolvedBy(null);

        incident.setType(type);
        incident.setStatus(IncidentStatus.OPEN);
        incident.setSeverity(IncidentSeverity.MEDIUM);
        incident.setSource(IncidentSource.AUTOMATIC_CLOSURE);

        incident.setTitle(getAutomaticIncidentTitle(type));
        incident.setDescription(getAutomaticIncidentDescription(type, difference));

        incident.setResolutionNote(null);
        incident.setCreatedAt(createdAt);
        incident.setUpdatedAt(createdAt);
        incident.setResolvedAt(null);

        incidentRepository.save(incident);
    }

    private String getAutomaticIncidentTitle(IncidentType type) {
        return switch (type) {
            case CASH_DIFFERENCE -> "Cash difference detected";
            case MB_DIFFERENCE -> "MB difference detected";
            default -> throw new IllegalArgumentException(
                    "Unsupported automatic incident type: " + type
            );
        };
    }

    private String getAutomaticIncidentDescription(
            IncidentType type,
            BigDecimal difference
    ) {
        String differenceLabel = switch (type) {
            case CASH_DIFFERENCE -> "a cash difference";
            case MB_DIFFERENCE -> "an MB difference";
            default -> throw new IllegalArgumentException(
                    "Unsupported automatic incident type: " + type
            );
        };

        return "Shift closure recorded " 
                + differenceLabel
                + " of "
                + formatSignedAmount(difference)
                + ".";
    }

    private String formatSignedAmount(BigDecimal amount) {
        BigDecimal normalizedAmount = amount.setScale(2, RoundingMode.HALF_UP);
        BigDecimal absoluteAmount = normalizedAmount.abs();

        String sign = "";
        if (normalizedAmount.compareTo(ZERO) > 0) {
            sign = "+";
        } else if (normalizedAmount.compareTo(ZERO) < 0) {
            sign = "-";
        }

        return sign + "€" + absoluteAmount.toPlainString();
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

    @Transactional(readOnly = true)
    public ShiftClosePreviewResponse getClosePreview(UUID shiftId, UUID authenticatedUserId, Role authenticatedRole) {
        Shift shift = shiftRepository.findByIdWithDetails(shiftId)
                .orElseThrow(() -> new NotFoundException("Shift not found"));

        if (authenticatedRole != Role.ADMIN && !shift.getStaff().getId().equals(authenticatedUserId)) {
            throw new BusinessException("You are not allowed to access this shift");
        }

        if (shift.getStatus() != ShiftStatus.OPEN) {
            throw new BusinessException("Only open shifts can be previewed for closure");
        }

        List<Sale> activeSales = saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE);
        ShiftCloseTotals totals = calculateShiftTotals(activeSales, shift.getStore());

        return new ShiftClosePreviewResponse(
                shift.getId(),
                shift.getStaff().getId(),
                shift.getStaff().getFullName(),
                shift.getStore().getId(),
                shift.getStore().getName(),
                totals.totalCash(),
                totals.totalMb(),
                totals.totalGlovoOnline(),
                totals.totalGlovoCash(),
                totals.totalSales(),
                totals.pendingInvoiceTotal(),
                totals.cashToWithdraw(),
                totals.expectedPhysicalCash()
        );
    }

    private ShiftCloseTotals calculateShiftTotals(List<Sale> activeSales, Store store) {
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
        BigDecimal expectedPhysicalCash = store.getBaseCashAmount()
                .add(cashToWithdraw)
                .setScale(2, RoundingMode.HALF_UP);

        return new ShiftCloseTotals(
                totalCash, totalMb, totalGlovoOnline, totalGlovoCash,
                totalSales, pendingInvoiceTotal, cashToWithdraw, expectedPhysicalCash
        );
    }

    private record ShiftCloseTotals(
            BigDecimal totalCash,
            BigDecimal totalMb,
            BigDecimal totalGlovoOnline,
            BigDecimal totalGlovoCash,
            BigDecimal totalSales,
            BigDecimal pendingInvoiceTotal,
            BigDecimal cashToWithdraw,
            BigDecimal expectedPhysicalCash
    ) {
    }
}