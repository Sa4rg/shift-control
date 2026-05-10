package com.shiftcontrol.backend.reviews.service;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.repository.IncidentRepository;
import com.shiftcontrol.backend.reviews.dto.WeeklyReportResponse;
import com.shiftcontrol.backend.reviews.dto.WeeklyStaffSummaryResponse;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
class WeeklyReportServiceTest {

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private ShiftClosureRepository shiftClosureRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @InjectMocks
    private WeeklyReportService weeklyReportService;

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store storeWithId(UUID id) {
        Store store = new Store();
        store.setId(id);
        store.setName("Test Store");
        store.setAddress("Test Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        return store;
    }

    private User staffWithId(UUID id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setFullName(fullName);
        user.setRole(Role.STAFF);
        user.setActive(true);
        return user;
    }

    private Shift shiftFor(Store store, User staff) {
        Shift shift = new Shift();
        shift.setStore(store);
        shift.setStaff(staff);
        return shift;
    }

    private ShiftClosure closureFor(
            Shift shift,
            String totalCash,
            String totalMb,
            String totalGlovoOnline,
            String totalGlovoCash,
            String totalSales,
            String pendingInvoiceTotal,
            String cashDifference,
            String mbDifference
    ) {
        ShiftClosure closure = new ShiftClosure();
        closure.setShift(shift);
        closure.setTotalCash(new BigDecimal(totalCash));
        closure.setTotalMb(new BigDecimal(totalMb));
        closure.setTotalGlovoOnline(new BigDecimal(totalGlovoOnline));
        closure.setTotalGlovoCash(new BigDecimal(totalGlovoCash));
        closure.setTotalSales(new BigDecimal(totalSales));
        closure.setPendingInvoiceTotal(new BigDecimal(pendingInvoiceTotal));
        closure.setCashDifference(new BigDecimal(cashDifference));
        closure.setMbDifference(new BigDecimal(mbDifference));
        return closure;
    }

    private Incident incidentForShift(Shift shift) {
        Incident incident = new Incident();
        incident.setShift(shift);
        return incident;
    }

    /** Finds a staff summary by staffId to avoid order-dependent assertions. */
    private WeeklyStaffSummaryResponse summaryForStaff(List<WeeklyStaffSummaryResponse> summaries, UUID staffId) {
        return summaries.stream()
                .filter(s -> staffId.equals(s.staffId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No summary found for staffId " + staffId));
    }

    // -------------------------------------------------------------------------
    // Test 1: full report grouped by staff with aggregated totals
    // -------------------------------------------------------------------------

    @Test
    void should_generate_weekly_report_grouped_by_staff() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId);

        UUID staffAId = UUID.randomUUID();
        UUID staffBId = UUID.randomUUID();
        User staffA = staffWithId(staffAId, "Staff A");
        User staffB = staffWithId(staffBId, "Staff B");

        Shift shiftA = shiftFor(store, staffA);
        Shift shiftB = shiftFor(store, staffB);

        // Staff A: two closures
        ShiftClosure closureA1 = closureFor(shiftA, "40.00", "25.00", "15.00", "10.00", "90.00", "25.00", "0.00", "0.00");
        ShiftClosure closureA2 = closureFor(shiftA, "20.00", "30.00",  "0.00",  "5.00", "55.00",  "0.00", "-3.00", "2.00");
        // Staff B: one closure
        ShiftClosure closureB  = closureFor(shiftB, "100.00", "0.00",  "0.00",  "0.00", "100.00", "100.00", "0.00", "0.00");

        Incident incidentA1 = incidentForShift(shiftA);
        Incident incidentA2 = incidentForShift(shiftA);
        Incident incidentB  = incidentForShift(shiftB);

        LocalDate weekStart = LocalDate.of(2026, 5, 4);
        Instant from = weekStart.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to   = weekStart.plusDays(7).atStartOfDay().toInstant(ZoneOffset.UTC);

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findWeeklyClosuresWithDetails(storeId, from, to))
                .thenReturn(List.of(closureA1, closureA2, closureB));
        when(incidentRepository.findWeeklyIncidentsWithContext(storeId, from, to))
                .thenReturn(List.of(incidentA1, incidentA2, incidentB));

        // Act
        WeeklyReportResponse response = weeklyReportService.getWeeklyReport(storeId, weekStart);

        // Assert — report metadata
        assertThat(response.storeId()).isEqualTo(storeId);
        assertThat(response.weekStart()).isEqualTo(LocalDate.of(2026, 5, 4));
        assertThat(response.weekEnd()).isEqualTo(LocalDate.of(2026, 5, 10));
        assertThat(response.staffSummaries()).hasSize(2);

        // Assert — Staff A aggregated totals
        WeeklyStaffSummaryResponse summaryA = summaryForStaff(response.staffSummaries(), staffAId);
        assertThat(summaryA.totalCash()).isEqualByComparingTo("60.00");
        assertThat(summaryA.totalMb()).isEqualByComparingTo("55.00");
        assertThat(summaryA.totalGlovoOnline()).isEqualByComparingTo("15.00");
        assertThat(summaryA.totalGlovoCash()).isEqualByComparingTo("15.00");
        assertThat(summaryA.totalSales()).isEqualByComparingTo("145.00");
        assertThat(summaryA.pendingInvoiceTotal()).isEqualByComparingTo("25.00");
        assertThat(summaryA.cashDifferenceTotal()).isEqualByComparingTo("-3.00");
        assertThat(summaryA.mbDifferenceTotal()).isEqualByComparingTo("2.00");
        assertThat(summaryA.closuresCount()).isEqualTo(2);
        assertThat(summaryA.incidentCount()).isEqualTo(2);

        // Assert — Staff B aggregated totals
        WeeklyStaffSummaryResponse summaryB = summaryForStaff(response.staffSummaries(), staffBId);
        assertThat(summaryB.totalCash()).isEqualByComparingTo("100.00");
        assertThat(summaryB.totalMb()).isEqualByComparingTo("0.00");
        assertThat(summaryB.totalGlovoOnline()).isEqualByComparingTo("0.00");
        assertThat(summaryB.totalGlovoCash()).isEqualByComparingTo("0.00");
        assertThat(summaryB.totalSales()).isEqualByComparingTo("100.00");
        assertThat(summaryB.pendingInvoiceTotal()).isEqualByComparingTo("100.00");
        assertThat(summaryB.cashDifferenceTotal()).isEqualByComparingTo("0.00");
        assertThat(summaryB.mbDifferenceTotal()).isEqualByComparingTo("0.00");
        assertThat(summaryB.closuresCount()).isEqualTo(1);
        assertThat(summaryB.incidentCount()).isEqualTo(1);
    }

    // -------------------------------------------------------------------------
    // Test 2: no closures → empty summaries, weekEnd = weekStart + 6
    // -------------------------------------------------------------------------

    @Test
    void should_return_empty_staff_summaries_when_no_closures() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId);
        LocalDate weekStart = LocalDate.of(2026, 5, 4);
        Instant from = weekStart.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to   = weekStart.plusDays(7).atStartOfDay().toInstant(ZoneOffset.UTC);

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findWeeklyClosuresWithDetails(storeId, from, to)).thenReturn(List.of());
        when(incidentRepository.findWeeklyIncidentsWithContext(storeId, from, to)).thenReturn(List.of());

        // Act
        WeeklyReportResponse response = weeklyReportService.getWeeklyReport(storeId, weekStart);

        // Assert
        assertThat(response.staffSummaries()).isEmpty();
        assertThat(response.weekEnd()).isEqualTo(weekStart.plusDays(6));
    }

    // -------------------------------------------------------------------------
    // Test 3: incidents for staff without a closure are silently ignored
    // -------------------------------------------------------------------------

    @Test
    void should_ignore_incidents_for_staff_without_closure_in_report() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId);

        UUID staffAId = UUID.randomUUID();
        UUID staffBId = UUID.randomUUID();
        User staffA = staffWithId(staffAId, "Staff A");
        User staffB = staffWithId(staffBId, "Staff B");

        Shift shiftA = shiftFor(store, staffA);
        Shift shiftB = shiftFor(store, staffB);

        // Only Staff A has a closure
        ShiftClosure closureA = closureFor(shiftA, "50.00", "0.00", "0.00", "0.00", "50.00", "0.00", "0.00", "0.00");

        // Both staff have incidents, but only Staff A has a closure in the period
        Incident incidentA = incidentForShift(shiftA);
        Incident incidentB = incidentForShift(shiftB);

        LocalDate weekStart = LocalDate.of(2026, 5, 4);
        Instant from = weekStart.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to   = weekStart.plusDays(7).atStartOfDay().toInstant(ZoneOffset.UTC);

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findWeeklyClosuresWithDetails(storeId, from, to)).thenReturn(List.of(closureA));
        when(incidentRepository.findWeeklyIncidentsWithContext(storeId, from, to)).thenReturn(List.of(incidentA, incidentB));

        // Act
        WeeklyReportResponse response = weeklyReportService.getWeeklyReport(storeId, weekStart);

        // Assert
        assertThat(response.staffSummaries()).hasSize(1);
        WeeklyStaffSummaryResponse summaryA = summaryForStaff(response.staffSummaries(), staffAId);
        assertThat(summaryA.incidentCount()).isEqualTo(1);
    }

    // -------------------------------------------------------------------------
    // Test 4: unknown store → NotFoundException, repositories never called
    // -------------------------------------------------------------------------

    @Test
    void should_throw_not_found_when_store_does_not_exist() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        LocalDate weekStart = LocalDate.of(2026, 5, 4);

        when(storeRepository.findById(storeId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> weeklyReportService.getWeeklyReport(storeId, weekStart))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Store not found");

        verify(shiftClosureRepository, never()).findWeeklyClosuresWithDetails(any(), any(), any());
        verify(incidentRepository, never()).findWeeklyIncidentsWithContext(any(), any(), any());
    }

    // -------------------------------------------------------------------------
    // Test 5: repositories are called with the exact UTC week range
    // -------------------------------------------------------------------------

    @Test
    void should_call_repositories_with_correct_week_range() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId);
        LocalDate weekStart = LocalDate.of(2026, 5, 4);

        Instant expectedFrom = Instant.parse("2026-05-04T00:00:00Z");
        Instant expectedTo   = Instant.parse("2026-05-11T00:00:00Z");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findWeeklyClosuresWithDetails(storeId, expectedFrom, expectedTo))
                .thenReturn(List.of());
        when(incidentRepository.findWeeklyIncidentsWithContext(storeId, expectedFrom, expectedTo))
                .thenReturn(List.of());

        // Act
        weeklyReportService.getWeeklyReport(storeId, weekStart);

        // Assert
        verify(shiftClosureRepository).findWeeklyClosuresWithDetails(storeId, expectedFrom, expectedTo);
        verify(incidentRepository).findWeeklyIncidentsWithContext(storeId, expectedFrom, expectedTo);
    }
}
