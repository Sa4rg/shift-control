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
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.model.ShiftType;
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
class MonthlyReportServiceTest {

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private ShiftClosureRepository shiftClosureRepository;

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private WeeklyAdminReviewRepository weeklyAdminReviewRepository;

    @InjectMocks
    private MonthlyReportService monthlyReportService;

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store storeWithId(UUID id, String name) {
        Store store = new Store();
        store.setId(id);
        store.setName(name);
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

    private Shift shiftFor(Store store, User staff, Instant closedAt) {
        Shift shift = new Shift();
        shift.setStore(store);
        shift.setStaff(staff);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.CLOSED);
        shift.setOpenedAt(closedAt.minusSeconds(3600));
        shift.setClosedAt(closedAt);
        return shift;
    }

    private ShiftClosure closureFor(
            Shift shift,
            ClosureStatus status,
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
        closure.setStatus(status);
        closure.setTotalCash(new BigDecimal(totalCash));
        closure.setTotalMb(new BigDecimal(totalMb));
        closure.setTotalGlovoOnline(new BigDecimal(totalGlovoOnline));
        closure.setTotalGlovoCash(new BigDecimal(totalGlovoCash));
        closure.setTotalSales(new BigDecimal(totalSales));
        closure.setPendingInvoiceTotal(new BigDecimal(pendingInvoiceTotal));
        closure.setCashDifference(new BigDecimal(cashDifference));
        closure.setMbDifference(new BigDecimal(mbDifference));
        // campos NOT NULL requeridos por la entidad aunque el servicio no los use
        closure.setCashToWithdraw(BigDecimal.ZERO);
        closure.setExpectedPhysicalCash(BigDecimal.ZERO);
        closure.setConfirmedCashAmount(BigDecimal.ZERO);
        closure.setConfirmedMbAmount(BigDecimal.ZERO);
        return closure;
    }

    private Incident incidentForShift(Shift shift, IncidentStatus status) {
        Incident incident = new Incident();
        incident.setShift(shift);
        incident.setStatus(status);
        return incident;
    }

    private WeeklyAdminReview weeklyReviewFor(
            Store store,
            User staff,
            LocalDate weekStart,
            WeeklyAdminReviewStatus status
    ) {
        Instant now = Instant.now();
        WeeklyAdminReview review = new WeeklyAdminReview();
        review.setStore(store);
        review.setStaff(staff);
        review.setWeekStart(weekStart);
        review.setWeekEnd(weekStart.plusDays(6));
        review.setStatus(status);
        review.setTotalCash(BigDecimal.ZERO);
        review.setTotalMb(BigDecimal.ZERO);
        review.setTotalGlovoOnline(BigDecimal.ZERO);
        review.setTotalGlovoCash(BigDecimal.ZERO);
        review.setTotalSales(BigDecimal.ZERO);
        review.setPendingInvoiceTotal(BigDecimal.ZERO);
        review.setCashDifferenceTotal(BigDecimal.ZERO);
        review.setMbDifferenceTotal(BigDecimal.ZERO);
        review.setClosuresCount(1);
        review.setIncidentCount(0);
        review.setCreatedAt(now);
        review.setUpdatedAt(now);
        return review;
    }

    private MonthlyStaffSummaryResponse summaryForStaff(List<MonthlyStaffSummaryResponse> summaries, UUID staffId) {
        return summaries.stream()
                .filter(s -> staffId.equals(s.staffId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No summary found for staffId " + staffId));
    }

    private MonthlyWeekSummaryResponse summaryForWeek(List<MonthlyWeekSummaryResponse> summaries, LocalDate weekStart) {
        return summaries.stream()
                .filter(s -> weekStart.equals(s.weekStart()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No week summary found for weekStart " + weekStart));
    }

    // -------------------------------------------------------------------------
    // Test 1: reporte completo agrupado por staff y semana
    // -------------------------------------------------------------------------

    @Test
    void should_generate_monthly_report_grouped_by_staff_and_week() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId, "Main Store");

        UUID staffAId = UUID.randomUUID();
        UUID staffBId = UUID.randomUUID();
        User staffA = staffWithId(staffAId, "Staff A");
        User staffB = staffWithId(staffBId, "Staff B");

        Instant closedAt1 = Instant.parse("2026-05-04T10:00:00Z");  // lunes semana 2026-05-04
        Instant closedAt2 = Instant.parse("2026-05-05T10:00:00Z");  // martes → misma semana 2026-05-04
        Instant closedAt3 = Instant.parse("2026-05-12T10:00:00Z");  // martes semana 2026-05-11

        Shift shiftA1 = shiftFor(store, staffA, closedAt1);
        Shift shiftA2 = shiftFor(store, staffA, closedAt2);
        Shift shiftB  = shiftFor(store, staffB,  closedAt3);

        ShiftClosure closureA1 = closureFor(shiftA1, ClosureStatus.CLOSED_OK,
                "40.00", "25.00", "15.00", "10.00", "90.00", "25.00", "0.00", "0.00");
        ShiftClosure closureA2 = closureFor(shiftA2, ClosureStatus.CLOSED_WITH_INCIDENT,
                "20.00", "30.00", "0.00", "5.00", "55.00", "0.00", "-3.00", "2.00");
        ShiftClosure closureB  = closureFor(shiftB,  ClosureStatus.CLOSED_OK,
                "100.00", "0.00", "0.00", "0.00", "100.00", "100.00", "0.00", "0.00");

        Incident incidentA1 = incidentForShift(shiftA1, IncidentStatus.OPEN);
        Incident incidentA2 = incidentForShift(shiftA2, IncidentStatus.RESOLVED);
        Incident incidentB  = incidentForShift(shiftB,  IncidentStatus.OPEN);

        LocalDate weekStartA = LocalDate.of(2026, 5, 4);
        LocalDate weekStartB = LocalDate.of(2026, 5, 11);

        WeeklyAdminReview reviewA = weeklyReviewFor(store, staffA, weekStartA, WeeklyAdminReviewStatus.REVIEWED_OK);
        WeeklyAdminReview reviewB = weeklyReviewFor(store, staffB, weekStartB, WeeklyAdminReviewStatus.REVIEWED_WITH_INCIDENT);

        LocalDate monthStart = LocalDate.of(2026, 5, 1);
        Instant from = Instant.parse("2026-05-01T00:00:00Z");
        Instant to   = Instant.parse("2026-06-01T00:00:00Z");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findClosuresWithDetailsByStoreAndClosedAtBetween(storeId, from, to))
                .thenReturn(List.of(closureA1, closureA2, closureB));
        when(incidentRepository.findIncidentsWithContextByStoreAndCreatedAtBetween(storeId, from, to))
                .thenReturn(List.of(incidentA1, incidentA2, incidentB));
        when(weeklyAdminReviewRepository.findByStoreAndWeekStartBetweenWithDetails(
                storeId, monthStart, monthStart.plusMonths(1)))
                .thenReturn(List.of(reviewA, reviewB));
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(storeId, from, to, SaleStatus.ACTIVE))
                .thenReturn(3L);
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(storeId, from, to, SaleStatus.CANCELLED))
                .thenReturn(1L);

        // Act
        MonthlyReportResponse response = monthlyReportService.getMonthlyReport(storeId, "2026-05");

        // Assert — metadatos del reporte
        assertThat(response.storeId()).isEqualTo(storeId);
        assertThat(response.storeName()).isEqualTo("Main Store");
        assertThat(response.monthStart()).isEqualTo(LocalDate.of(2026, 5, 1));
        assertThat(response.monthEnd()).isEqualTo(LocalDate.of(2026, 5, 31));

        // Assert — totales globales
        assertThat(response.totalCash()).isEqualByComparingTo("160.00");
        assertThat(response.totalMb()).isEqualByComparingTo("55.00");
        assertThat(response.totalGlovoOnline()).isEqualByComparingTo("15.00");
        assertThat(response.totalGlovoCash()).isEqualByComparingTo("15.00");
        assertThat(response.totalSales()).isEqualByComparingTo("245.00");
        assertThat(response.pendingInvoiceTotal()).isEqualByComparingTo("125.00");
        assertThat(response.cashDifferenceTotal()).isEqualByComparingTo("-3.00");
        assertThat(response.mbDifferenceTotal()).isEqualByComparingTo("2.00");

        assertThat(response.closuresCount()).isEqualTo(3);
        assertThat(response.closedOkCount()).isEqualTo(2);
        assertThat(response.closedWithIncidentCount()).isEqualTo(1);

        assertThat(response.activeSalesCount()).isEqualTo(3);
        assertThat(response.cancelledSalesCount()).isEqualTo(1);

        assertThat(response.openIncidentsCount()).isEqualTo(2);
        assertThat(response.resolvedIncidentsCount()).isEqualTo(1);

        assertThat(response.weeklyReviewsCount()).isEqualTo(2);
        assertThat(response.weeklyReviewsOkCount()).isEqualTo(1);
        assertThat(response.weeklyReviewsWithIncidentCount()).isEqualTo(1);

        // Assert — resumen Staff A
        assertThat(response.staffSummaries()).hasSize(2);
        MonthlyStaffSummaryResponse summaryA = summaryForStaff(response.staffSummaries(), staffAId);
        assertThat(summaryA.totalCash()).isEqualByComparingTo("60.00");
        assertThat(summaryA.totalMb()).isEqualByComparingTo("55.00");
        assertThat(summaryA.totalGlovoOnline()).isEqualByComparingTo("15.00");
        assertThat(summaryA.totalGlovoCash()).isEqualByComparingTo("15.00");
        assertThat(summaryA.totalSales()).isEqualByComparingTo("145.00");
        assertThat(summaryA.pendingInvoiceTotal()).isEqualByComparingTo("25.00");
        assertThat(summaryA.cashDifferenceTotal()).isEqualByComparingTo("-3.00");
        assertThat(summaryA.mbDifferenceTotal()).isEqualByComparingTo("2.00");
        assertThat(summaryA.closuresCount()).isEqualTo(2);
        assertThat(summaryA.closedOkCount()).isEqualTo(1);
        assertThat(summaryA.closedWithIncidentCount()).isEqualTo(1);
        assertThat(summaryA.openIncidentsCount()).isEqualTo(1);
        assertThat(summaryA.resolvedIncidentsCount()).isEqualTo(1);
        assertThat(summaryA.weeklyReviewsCount()).isEqualTo(1);
        assertThat(summaryA.weeklyReviewsOkCount()).isEqualTo(1);
        assertThat(summaryA.weeklyReviewsWithIncidentCount()).isEqualTo(0);

        // Assert — resumen Staff B
        MonthlyStaffSummaryResponse summaryB = summaryForStaff(response.staffSummaries(), staffBId);
        assertThat(summaryB.totalCash()).isEqualByComparingTo("100.00");
        assertThat(summaryB.totalSales()).isEqualByComparingTo("100.00");
        assertThat(summaryB.closuresCount()).isEqualTo(1);
        assertThat(summaryB.openIncidentsCount()).isEqualTo(1);
        assertThat(summaryB.resolvedIncidentsCount()).isEqualTo(0);
        assertThat(summaryB.weeklyReviewsCount()).isEqualTo(1);
        assertThat(summaryB.weeklyReviewsWithIncidentCount()).isEqualTo(1);

        // Assert — resúmenes por semana
        assertThat(response.weekSummaries()).hasSize(2);

        MonthlyWeekSummaryResponse weekA = summaryForWeek(response.weekSummaries(), weekStartA);
        assertThat(weekA.weekEnd()).isEqualTo(weekStartA.plusDays(6));
        assertThat(weekA.closuresCount()).isEqualTo(2);  // closureA1 + closureA2 (ambos en semana 2026-05-04)
        assertThat(weekA.weeklyReviewsCount()).isEqualTo(1);  // reviewA

        MonthlyWeekSummaryResponse weekB = summaryForWeek(response.weekSummaries(), weekStartB);
        assertThat(weekB.weekEnd()).isEqualTo(weekStartB.plusDays(6));
        assertThat(weekB.closuresCount()).isEqualTo(1);  // closureB
        assertThat(weekB.weeklyReviewsCount()).isEqualTo(1);  // reviewB
    }

    // -------------------------------------------------------------------------
    // Test 2: reporte vacío cuando no hay datos en el mes
    // -------------------------------------------------------------------------

    @Test
    void should_return_empty_report_when_no_data_exists_for_month() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId, "Empty Store");
        LocalDate monthStart = LocalDate.of(2026, 5, 1);
        Instant from = Instant.parse("2026-05-01T00:00:00Z");
        Instant to   = Instant.parse("2026-06-01T00:00:00Z");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findClosuresWithDetailsByStoreAndClosedAtBetween(storeId, from, to))
                .thenReturn(List.of());
        when(incidentRepository.findIncidentsWithContextByStoreAndCreatedAtBetween(storeId, from, to))
                .thenReturn(List.of());
        when(weeklyAdminReviewRepository.findByStoreAndWeekStartBetweenWithDetails(
                storeId, monthStart, monthStart.plusMonths(1)))
                .thenReturn(List.of());
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(storeId, from, to, SaleStatus.ACTIVE))
                .thenReturn(0L);
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(storeId, from, to, SaleStatus.CANCELLED))
                .thenReturn(0L);

        // Act
        MonthlyReportResponse response = monthlyReportService.getMonthlyReport(storeId, "2026-05");

        // Assert
        assertThat(response.totalCash()).isEqualByComparingTo("0.00");
        assertThat(response.totalMb()).isEqualByComparingTo("0.00");
        assertThat(response.totalGlovoOnline()).isEqualByComparingTo("0.00");
        assertThat(response.totalGlovoCash()).isEqualByComparingTo("0.00");
        assertThat(response.totalSales()).isEqualByComparingTo("0.00");
        assertThat(response.pendingInvoiceTotal()).isEqualByComparingTo("0.00");
        assertThat(response.cashDifferenceTotal()).isEqualByComparingTo("0.00");
        assertThat(response.mbDifferenceTotal()).isEqualByComparingTo("0.00");

        assertThat(response.closuresCount()).isEqualTo(0);
        assertThat(response.closedOkCount()).isEqualTo(0);
        assertThat(response.closedWithIncidentCount()).isEqualTo(0);
        assertThat(response.activeSalesCount()).isEqualTo(0);
        assertThat(response.cancelledSalesCount()).isEqualTo(0);
        assertThat(response.openIncidentsCount()).isEqualTo(0);
        assertThat(response.resolvedIncidentsCount()).isEqualTo(0);
        assertThat(response.weeklyReviewsCount()).isEqualTo(0);
        assertThat(response.weeklyReviewsOkCount()).isEqualTo(0);
        assertThat(response.weeklyReviewsWithIncidentCount()).isEqualTo(0);

        assertThat(response.staffSummaries()).isEmpty();
        assertThat(response.weekSummaries()).isEmpty();
    }

    // -------------------------------------------------------------------------
    // Test 3: tienda no encontrada
    // -------------------------------------------------------------------------

    @Test
    void should_throw_not_found_when_store_does_not_exist() {
        // Arrange
        UUID unknownStoreId = UUID.randomUUID();
        when(storeRepository.findById(unknownStoreId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> monthlyReportService.getMonthlyReport(unknownStoreId, "2026-05"))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Store not found");

        verify(shiftClosureRepository, never()).findClosuresWithDetailsByStoreAndClosedAtBetween(any(), any(), any());
        verify(incidentRepository, never()).findIncidentsWithContextByStoreAndCreatedAtBetween(any(), any(), any());
        verify(weeklyAdminReviewRepository, never()).findByStoreAndWeekStartBetweenWithDetails(any(), any(), any());
        verify(saleRepository, never()).countByStoreAndCreatedAtBetweenAndStatus(any(), any(), any(), any());
    }

    // -------------------------------------------------------------------------
    // Test 4: los repositorios reciben el rango de fechas correcto para 2026-05
    // -------------------------------------------------------------------------

    @Test
    void should_call_repositories_with_correct_month_range() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId, "Range Store");

        LocalDate expectedMonthStart       = LocalDate.of(2026, 5, 1);
        LocalDate expectedWeeklyReviewsTo  = LocalDate.of(2026, 6, 1);
        Instant   expectedFrom             = Instant.parse("2026-05-01T00:00:00Z");
        Instant   expectedTo               = Instant.parse("2026-06-01T00:00:00Z");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findClosuresWithDetailsByStoreAndClosedAtBetween(
                storeId, expectedFrom, expectedTo)).thenReturn(List.of());
        when(incidentRepository.findIncidentsWithContextByStoreAndCreatedAtBetween(
                storeId, expectedFrom, expectedTo)).thenReturn(List.of());
        when(weeklyAdminReviewRepository.findByStoreAndWeekStartBetweenWithDetails(
                storeId, expectedMonthStart, expectedWeeklyReviewsTo)).thenReturn(List.of());
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(
                storeId, expectedFrom, expectedTo, SaleStatus.ACTIVE)).thenReturn(0L);
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(
                storeId, expectedFrom, expectedTo, SaleStatus.CANCELLED)).thenReturn(0L);

        // Act
        monthlyReportService.getMonthlyReport(storeId, "2026-05");

        // Assert
        verify(shiftClosureRepository).findClosuresWithDetailsByStoreAndClosedAtBetween(
                storeId, expectedFrom, expectedTo);
        verify(incidentRepository).findIncidentsWithContextByStoreAndCreatedAtBetween(
                storeId, expectedFrom, expectedTo);
        verify(weeklyAdminReviewRepository).findByStoreAndWeekStartBetweenWithDetails(
                storeId, expectedMonthStart, expectedWeeklyReviewsTo);
        verify(saleRepository).countByStoreAndCreatedAtBetweenAndStatus(
                storeId, expectedFrom, expectedTo, SaleStatus.ACTIVE);
        verify(saleRepository).countByStoreAndCreatedAtBetweenAndStatus(
                storeId, expectedFrom, expectedTo, SaleStatus.CANCELLED);
    }
}
