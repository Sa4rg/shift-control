package com.shiftcontrol.backend.reports.service;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.repository.IncidentRepository;
import com.shiftcontrol.backend.reports.dto.DailyReportResponse;
import com.shiftcontrol.backend.reports.dto.DailyStaffSummaryResponse;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.sales.repository.SaleRepository;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DailyReportService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final StoreRepository storeRepository;
    private final ShiftClosureRepository shiftClosureRepository;
    private final SaleRepository saleRepository;
    private final IncidentRepository incidentRepository;

    public DailyReportService(
            StoreRepository storeRepository,
            ShiftClosureRepository shiftClosureRepository,
            SaleRepository saleRepository,
            IncidentRepository incidentRepository
    ) {
        this.storeRepository = storeRepository;
        this.shiftClosureRepository = shiftClosureRepository;
        this.saleRepository = saleRepository;
        this.incidentRepository = incidentRepository;
    }

    @Transactional(readOnly = true)
    public DailyReportResponse getDailyReport(UUID storeId, LocalDate date) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NotFoundException("Store not found"));

        Instant from = date.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        List<ShiftClosure> closures = shiftClosureRepository.findClosuresWithDetailsByStoreAndClosedAtBetween(
                store.getId(),
                from,
                to
        );

        List<Incident> incidents = incidentRepository.findIncidentsWithContextByStoreAndCreatedAtBetween(
                store.getId(),
                from,
                to
        );

        long activeSalesCount = saleRepository.countByStoreAndCreatedAtBetweenAndStatus(
                store.getId(),
                from,
                to,
                SaleStatus.ACTIVE
        );

        long cancelledSalesCount = saleRepository.countByStoreAndCreatedAtBetweenAndStatus(
                store.getId(),
                from,
                to,
                SaleStatus.CANCELLED
        );

        DailyTotals totals = new DailyTotals();
        Map<UUID, StaffAccumulator> staffAccumulators = new LinkedHashMap<>();

        for (ShiftClosure closure : closures) {
            totals.addClosure(closure);

            User staff = closure.getShift().getStaff();

            staffAccumulators
                    .computeIfAbsent(staff.getId(), ignored -> new StaffAccumulator(staff))
                    .addClosure(closure);
        }

        for (Incident incident : incidents) {
            totals.addIncident(incident);

            UUID staffId = extractIncidentStaffId(incident);

            if (staffId != null && staffAccumulators.containsKey(staffId)) {
                staffAccumulators.get(staffId).addIncident(incident);
            }
        }

        List<DailyStaffSummaryResponse> staffSummaries = staffAccumulators.values()
                .stream()
                .sorted(Comparator.comparing(StaffAccumulator::staffName))
                .map(StaffAccumulator::toResponse)
                .toList();

        return new DailyReportResponse(
                store.getId(),
                store.getName(),

                date,

                totals.totalCash,
                totals.totalMb,
                totals.totalGlovoOnline,
                totals.totalGlovoCash,
                totals.totalSales,
                totals.pendingInvoiceTotal,

                totals.cashDifferenceTotal,
                totals.mbDifferenceTotal,

                totals.closuresCount,
                totals.closedOkCount,
                totals.closedWithIncidentCount,

                Math.toIntExact(activeSalesCount),
                Math.toIntExact(cancelledSalesCount),

                totals.openIncidentsCount,
                totals.resolvedIncidentsCount,

                staffSummaries
        );
    }

    private UUID extractIncidentStaffId(Incident incident) {
        if (incident.getShift() != null) {
            return incident.getShift().getStaff().getId();
        }

        if (incident.getClosure() != null) {
            return incident.getClosure().getShift().getStaff().getId();
        }

        if (incident.getSale() != null) {
            return incident.getSale().getStaff().getId();
        }

        return null;
    }

    private static BigDecimal add(BigDecimal left, BigDecimal right) {
        return left.add(right).setScale(2, RoundingMode.HALF_UP);
    }

    private static class DailyTotals {

        private BigDecimal totalCash = ZERO;
        private BigDecimal totalMb = ZERO;
        private BigDecimal totalGlovoOnline = ZERO;
        private BigDecimal totalGlovoCash = ZERO;
        private BigDecimal totalSales = ZERO;
        private BigDecimal pendingInvoiceTotal = ZERO;
        private BigDecimal cashDifferenceTotal = ZERO;
        private BigDecimal mbDifferenceTotal = ZERO;

        private int closuresCount = 0;
        private int closedOkCount = 0;
        private int closedWithIncidentCount = 0;

        private int openIncidentsCount = 0;
        private int resolvedIncidentsCount = 0;

        private void addClosure(ShiftClosure closure) {
            totalCash = add(totalCash, closure.getTotalCash());
            totalMb = add(totalMb, closure.getTotalMb());
            totalGlovoOnline = add(totalGlovoOnline, closure.getTotalGlovoOnline());
            totalGlovoCash = add(totalGlovoCash, closure.getTotalGlovoCash());
            totalSales = add(totalSales, closure.getTotalSales());
            pendingInvoiceTotal = add(pendingInvoiceTotal, closure.getPendingInvoiceTotal());
            cashDifferenceTotal = add(cashDifferenceTotal, closure.getCashDifference());
            mbDifferenceTotal = add(mbDifferenceTotal, closure.getMbDifference());

            closuresCount++;

            if (closure.getStatus() == ClosureStatus.CLOSED_OK) {
                closedOkCount++;
            }

            if (closure.getStatus() == ClosureStatus.CLOSED_WITH_INCIDENT) {
                closedWithIncidentCount++;
            }
        }

        private void addIncident(Incident incident) {
            if (incident.getStatus() == IncidentStatus.OPEN) {
                openIncidentsCount++;
            }

            if (incident.getStatus() == IncidentStatus.RESOLVED) {
                resolvedIncidentsCount++;
            }
        }
    }

    private static class StaffAccumulator {

        private final User staff;

        private BigDecimal totalCash = ZERO;
        private BigDecimal totalMb = ZERO;
        private BigDecimal totalGlovoOnline = ZERO;
        private BigDecimal totalGlovoCash = ZERO;
        private BigDecimal totalSales = ZERO;
        private BigDecimal pendingInvoiceTotal = ZERO;
        private BigDecimal cashDifferenceTotal = ZERO;
        private BigDecimal mbDifferenceTotal = ZERO;

        private int closuresCount = 0;
        private int closedOkCount = 0;
        private int closedWithIncidentCount = 0;

        private int openIncidentsCount = 0;
        private int resolvedIncidentsCount = 0;

        private StaffAccumulator(User staff) {
            this.staff = staff;
        }

        private String staffName() {
            return staff.getFullName();
        }

        private void addClosure(ShiftClosure closure) {
            totalCash = add(totalCash, closure.getTotalCash());
            totalMb = add(totalMb, closure.getTotalMb());
            totalGlovoOnline = add(totalGlovoOnline, closure.getTotalGlovoOnline());
            totalGlovoCash = add(totalGlovoCash, closure.getTotalGlovoCash());
            totalSales = add(totalSales, closure.getTotalSales());
            pendingInvoiceTotal = add(pendingInvoiceTotal, closure.getPendingInvoiceTotal());
            cashDifferenceTotal = add(cashDifferenceTotal, closure.getCashDifference());
            mbDifferenceTotal = add(mbDifferenceTotal, closure.getMbDifference());

            closuresCount++;

            if (closure.getStatus() == ClosureStatus.CLOSED_OK) {
                closedOkCount++;
            }

            if (closure.getStatus() == ClosureStatus.CLOSED_WITH_INCIDENT) {
                closedWithIncidentCount++;
            }
        }

        private void addIncident(Incident incident) {
            if (incident.getStatus() == IncidentStatus.OPEN) {
                openIncidentsCount++;
            }

            if (incident.getStatus() == IncidentStatus.RESOLVED) {
                resolvedIncidentsCount++;
            }
        }

        private DailyStaffSummaryResponse toResponse() {
            return new DailyStaffSummaryResponse(
                    staff.getId(),
                    staff.getFullName(),

                    totalCash,
                    totalMb,
                    totalGlovoOnline,
                    totalGlovoCash,
                    totalSales,
                    pendingInvoiceTotal,

                    cashDifferenceTotal,
                    mbDifferenceTotal,

                    closuresCount,
                    closedOkCount,
                    closedWithIncidentCount,

                    0,
                    0,

                    openIncidentsCount,
                    resolvedIncidentsCount
            );
        }
    }
}