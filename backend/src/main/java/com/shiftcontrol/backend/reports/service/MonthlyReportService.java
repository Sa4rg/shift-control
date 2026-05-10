package com.shiftcontrol.backend.reports.service;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.repository.IncidentRepository;
import com.shiftcontrol.backend.reports.dto.MonthlyReportResponse;
import com.shiftcontrol.backend.reports.dto.MonthlyStaffSummaryResponse;
import com.shiftcontrol.backend.reports.dto.MonthlyWeekSummaryResponse;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;
import com.shiftcontrol.backend.reviews.repository.WeeklyAdminReviewRepository;
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
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MonthlyReportService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final StoreRepository storeRepository;
    private final ShiftClosureRepository shiftClosureRepository;
    private final SaleRepository saleRepository;
    private final IncidentRepository incidentRepository;
    private final WeeklyAdminReviewRepository weeklyAdminReviewRepository;

    public MonthlyReportService(
            StoreRepository storeRepository,
            ShiftClosureRepository shiftClosureRepository,
            SaleRepository saleRepository,
            IncidentRepository incidentRepository,
            WeeklyAdminReviewRepository weeklyAdminReviewRepository
    ) {
        this.storeRepository = storeRepository;
        this.shiftClosureRepository = shiftClosureRepository;
        this.saleRepository = saleRepository;
        this.incidentRepository = incidentRepository;
        this.weeklyAdminReviewRepository = weeklyAdminReviewRepository;
    }

    @Transactional(readOnly = true)
    public MonthlyReportResponse getMonthlyReport(UUID storeId, String month) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NotFoundException("Store not found"));

        YearMonth yearMonth = YearMonth.parse(month);
        LocalDate monthStart = yearMonth.atDay(1);
        LocalDate monthEnd = yearMonth.atEndOfMonth();

        Instant from = monthStart.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = monthStart.plusMonths(1).atStartOfDay().toInstant(ZoneOffset.UTC);

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

        List<WeeklyAdminReview> weeklyReviews = weeklyAdminReviewRepository.findByStoreAndWeekStartBetweenWithDetails(
                store.getId(),
                monthStart,
                monthStart.plusMonths(1)
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

        MonthlyTotals totals = new MonthlyTotals();

        Map<UUID, StaffAccumulator> staffAccumulators = new LinkedHashMap<>();
        Map<LocalDate, WeekAccumulator> weekAccumulators = new LinkedHashMap<>();

        for (ShiftClosure closure : closures) {
            totals.addClosure(closure);

            User staff = closure.getShift().getStaff();
            staffAccumulators
                    .computeIfAbsent(staff.getId(), ignored -> new StaffAccumulator(staff))
                    .addClosure(closure);

            LocalDate weekStart = startOfWeek(closure.getShift().getClosedAt().atZone(ZoneOffset.UTC).toLocalDate());
            LocalDate weekEnd = weekStart.plusDays(6);

            weekAccumulators
                    .computeIfAbsent(weekStart, ignored -> new WeekAccumulator(weekStart, weekEnd))
                    .addClosure(closure);
        }

        for (Incident incident : incidents) {
            totals.addIncident(incident);

            UUID staffId = extractIncidentStaffId(incident);

            if (staffId != null && staffAccumulators.containsKey(staffId)) {
                staffAccumulators.get(staffId).addIncident(incident);
            }
        }

        for (WeeklyAdminReview review : weeklyReviews) {
            totals.addWeeklyReview(review);

            UUID staffId = review.getStaff().getId();

            if (staffAccumulators.containsKey(staffId)) {
                staffAccumulators.get(staffId).addWeeklyReview(review);
            }

            weekAccumulators
                    .computeIfAbsent(
                            review.getWeekStart(),
                            ignored -> new WeekAccumulator(review.getWeekStart(), review.getWeekEnd())
                    )
                    .addWeeklyReview(review);
        }

        List<MonthlyStaffSummaryResponse> staffSummaries = staffAccumulators.values()
                .stream()
                .sorted(Comparator.comparing(StaffAccumulator::staffName))
                .map(StaffAccumulator::toResponse)
                .toList();

        List<MonthlyWeekSummaryResponse> weekSummaries = weekAccumulators.values()
                .stream()
                .sorted(Comparator.comparing(WeekAccumulator::weekStart))
                .map(WeekAccumulator::toResponse)
                .toList();

        return new MonthlyReportResponse(
                store.getId(),
                store.getName(),
                monthStart,
                monthEnd,

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

                totals.weeklyReviewsCount,
                totals.weeklyReviewsOkCount,
                totals.weeklyReviewsWithIncidentCount,

                staffSummaries,
                weekSummaries
        );
    }

    private LocalDate startOfWeek(LocalDate date) {
        return date.minusDays(date.getDayOfWeek().getValue() - 1L);
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

    private static class MonthlyTotals {

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

        private int weeklyReviewsCount = 0;
        private int weeklyReviewsOkCount = 0;
        private int weeklyReviewsWithIncidentCount = 0;

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

        private void addWeeklyReview(WeeklyAdminReview review) {
            weeklyReviewsCount++;

            if (review.getStatus() == WeeklyAdminReviewStatus.REVIEWED_OK) {
                weeklyReviewsOkCount++;
            }

            if (review.getStatus() == WeeklyAdminReviewStatus.REVIEWED_WITH_INCIDENT) {
                weeklyReviewsWithIncidentCount++;
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

        private int weeklyReviewsCount = 0;
        private int weeklyReviewsOkCount = 0;
        private int weeklyReviewsWithIncidentCount = 0;

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

        private void addWeeklyReview(WeeklyAdminReview review) {
            weeklyReviewsCount++;

            if (review.getStatus() == WeeklyAdminReviewStatus.REVIEWED_OK) {
                weeklyReviewsOkCount++;
            }

            if (review.getStatus() == WeeklyAdminReviewStatus.REVIEWED_WITH_INCIDENT) {
                weeklyReviewsWithIncidentCount++;
            }
        }

        private MonthlyStaffSummaryResponse toResponse() {
            return new MonthlyStaffSummaryResponse(
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

                    openIncidentsCount,
                    resolvedIncidentsCount,

                    weeklyReviewsCount,
                    weeklyReviewsOkCount,
                    weeklyReviewsWithIncidentCount
            );
        }
    }

    private static class WeekAccumulator {

        private final LocalDate weekStart;
        private final LocalDate weekEnd;

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

        private int weeklyReviewsCount = 0;
        private int weeklyReviewsOkCount = 0;
        private int weeklyReviewsWithIncidentCount = 0;

        private WeekAccumulator(LocalDate weekStart, LocalDate weekEnd) {
            this.weekStart = weekStart;
            this.weekEnd = weekEnd;
        }

        private LocalDate weekStart() {
            return weekStart;
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

        private void addWeeklyReview(WeeklyAdminReview review) {
            weeklyReviewsCount++;

            if (review.getStatus() == WeeklyAdminReviewStatus.REVIEWED_OK) {
                weeklyReviewsOkCount++;
            }

            if (review.getStatus() == WeeklyAdminReviewStatus.REVIEWED_WITH_INCIDENT) {
                weeklyReviewsWithIncidentCount++;
            }
        }

        private MonthlyWeekSummaryResponse toResponse() {
            return new MonthlyWeekSummaryResponse(
                    weekStart,
                    weekEnd,

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

                    weeklyReviewsCount,
                    weeklyReviewsOkCount,
                    weeklyReviewsWithIncidentCount
            );
        }
    }
}