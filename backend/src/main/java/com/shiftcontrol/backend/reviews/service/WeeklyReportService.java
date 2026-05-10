package com.shiftcontrol.backend.reviews.service;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.repository.IncidentRepository;
import com.shiftcontrol.backend.reviews.dto.WeeklyReportResponse;
import com.shiftcontrol.backend.reviews.dto.WeeklyStaffSummaryResponse;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WeeklyReportService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final StoreRepository storeRepository;
    private final ShiftClosureRepository shiftClosureRepository;
    private final IncidentRepository incidentRepository;

    public WeeklyReportService(
            StoreRepository storeRepository,
            ShiftClosureRepository shiftClosureRepository,
            IncidentRepository incidentRepository
    ) {
        this.storeRepository = storeRepository;
        this.shiftClosureRepository = shiftClosureRepository;
        this.incidentRepository = incidentRepository;
    }

    @Transactional(readOnly = true)
    public WeeklyReportResponse getWeeklyReport(UUID storeId, LocalDate weekStart) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NotFoundException("Store not found"));

        LocalDate weekEnd = weekStart.plusDays(6);

        Instant from = weekStart.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = weekStart.plusDays(7).atStartOfDay().toInstant(ZoneOffset.UTC);

        List<ShiftClosure> closures = shiftClosureRepository.findWeeklyClosuresWithDetails(
                store.getId(),
                from,
                to
        );

        List<Incident> incidents = incidentRepository.findWeeklyIncidentsWithContext(
                store.getId(),
                from,
                to
        );

        Map<UUID, WeeklyAccumulator> accumulators = new LinkedHashMap<>();

        for (ShiftClosure closure : closures) {
            User staff = closure.getShift().getStaff();

            WeeklyAccumulator accumulator = accumulators.computeIfAbsent(
                    staff.getId(),
                    ignored -> new WeeklyAccumulator(store, staff)
            );

            accumulator.addClosure(closure);
        }

        for (Incident incident : incidents) {
            UUID staffId = extractIncidentStaffId(incident);

            if (staffId == null) {
                continue;
            }

            WeeklyAccumulator accumulator = accumulators.get(staffId);

            if (accumulator != null) {
                accumulator.incrementIncidentCount();
            }
        }

        List<WeeklyStaffSummaryResponse> summaries = accumulators.values()
                .stream()
                .map(WeeklyAccumulator::toResponse)
                .toList();

        return new WeeklyReportResponse(
                store.getId(),
                weekStart,
                weekEnd,
                summaries
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

    private static class WeeklyAccumulator {

        private final Store store;
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
        private int incidentCount = 0;

        private WeeklyAccumulator(Store store, User staff) {
            this.store = store;
            this.staff = staff;
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
        }

        private void incrementIncidentCount() {
            incidentCount++;
        }

        private WeeklyStaffSummaryResponse toResponse() {
            return new WeeklyStaffSummaryResponse(
                    store.getId(),
                    store.getName(),
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
                    incidentCount
            );
        }

        private BigDecimal add(BigDecimal left, BigDecimal right) {
            return left.add(right).setScale(2, RoundingMode.HALF_UP);
        }
    }
}