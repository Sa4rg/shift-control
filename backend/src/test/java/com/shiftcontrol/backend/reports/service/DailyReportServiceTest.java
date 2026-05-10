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
class DailyReportServiceTest {

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private ShiftClosureRepository shiftClosureRepository;

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @InjectMocks
    private DailyReportService dailyReportService;

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

    private Shift shiftFor(Store store, User staff) {
        Shift shift = new Shift();
        shift.setStore(store);
        shift.setStaff(staff);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.CLOSED);
        shift.setOpenedAt(Instant.parse("2026-05-10T08:00:00Z"));
        shift.setClosedAt(Instant.parse("2026-05-10T16:00:00Z"));
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
        // campos NOT NULL de la entidad no usados por el servicio
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

    private DailyStaffSummaryResponse summaryForStaff(List<DailyStaffSummaryResponse> summaries, UUID staffId) {
        return summaries.stream()
                .filter(s -> staffId.equals(s.staffId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No summary found for staffId " + staffId));
    }

    // -------------------------------------------------------------------------
    // Test 1: reporte diario agrupado por staff con totales agregados correctos
    // -------------------------------------------------------------------------

    @Test
    void should_generate_daily_report_grouped_by_staff() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId, "Main Store");

        UUID staffAId = UUID.randomUUID();
        UUID staffBId = UUID.randomUUID();
        User staffA = staffWithId(staffAId, "Staff A");
        User staffB = staffWithId(staffBId, "Staff B");

        Shift shiftA1 = shiftFor(store, staffA);
        Shift shiftA2 = shiftFor(store, staffA);
        Shift shiftB  = shiftFor(store, staffB);

        ShiftClosure closureA1 = closureFor(shiftA1, ClosureStatus.CLOSED_OK,
                "40.00", "25.00", "15.00", "10.00", "90.00", "25.00", "0.00", "0.00");
        ShiftClosure closureA2 = closureFor(shiftA2, ClosureStatus.CLOSED_WITH_INCIDENT,
                "20.00", "30.00", "0.00", "5.00", "55.00", "0.00", "-3.00", "2.00");
        ShiftClosure closureB  = closureFor(shiftB, ClosureStatus.CLOSED_OK,
                "100.00", "0.00", "0.00", "0.00", "100.00", "100.00", "0.00", "0.00");

        Incident incidentA1 = incidentForShift(shiftA1, IncidentStatus.OPEN);
        Incident incidentA2 = incidentForShift(shiftA2, IncidentStatus.RESOLVED);
        Incident incidentB  = incidentForShift(shiftB,  IncidentStatus.OPEN);

        LocalDate date = LocalDate.of(2026, 5, 10);
        Instant from = Instant.parse("2026-05-10T00:00:00Z");
        Instant to   = Instant.parse("2026-05-11T00:00:00Z");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findClosuresWithDetailsByStoreAndClosedAtBetween(storeId, from, to))
                .thenReturn(List.of(closureA1, closureA2, closureB));
        when(incidentRepository.findIncidentsWithContextByStoreAndCreatedAtBetween(storeId, from, to))
                .thenReturn(List.of(incidentA1, incidentA2, incidentB));
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(storeId, from, to, SaleStatus.ACTIVE))
                .thenReturn(3L);
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(storeId, from, to, SaleStatus.CANCELLED))
                .thenReturn(1L);

        // Act
        DailyReportResponse response = dailyReportService.getDailyReport(storeId, date);

        // Assert — metadatos
        assertThat(response.storeId()).isEqualTo(storeId);
        assertThat(response.storeName()).isEqualTo("Main Store");
        assertThat(response.date()).isEqualTo(LocalDate.of(2026, 5, 10));

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

        // Assert — resúmenes por staff
        assertThat(response.staffSummaries()).hasSize(2);

        DailyStaffSummaryResponse summaryA = summaryForStaff(response.staffSummaries(), staffAId);
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
        assertThat(summaryA.activeSalesCount()).isEqualTo(0);    // por staff aún no implementado
        assertThat(summaryA.cancelledSalesCount()).isEqualTo(0); // por staff aún no implementado
        assertThat(summaryA.openIncidentsCount()).isEqualTo(1);
        assertThat(summaryA.resolvedIncidentsCount()).isEqualTo(1);

        DailyStaffSummaryResponse summaryB = summaryForStaff(response.staffSummaries(), staffBId);
        assertThat(summaryB.totalCash()).isEqualByComparingTo("100.00");
        assertThat(summaryB.totalSales()).isEqualByComparingTo("100.00");
        assertThat(summaryB.closuresCount()).isEqualTo(1);
        assertThat(summaryB.closedOkCount()).isEqualTo(1);
        assertThat(summaryB.closedWithIncidentCount()).isEqualTo(0);
        assertThat(summaryB.activeSalesCount()).isEqualTo(0);
        assertThat(summaryB.cancelledSalesCount()).isEqualTo(0);
        assertThat(summaryB.openIncidentsCount()).isEqualTo(1);
        assertThat(summaryB.resolvedIncidentsCount()).isEqualTo(0);
    }

    // -------------------------------------------------------------------------
    // Test 2: reporte vacío cuando no hay datos para la fecha
    // -------------------------------------------------------------------------

    @Test
    void should_return_empty_report_when_no_data_exists_for_date() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId, "Empty Store");
        LocalDate date = LocalDate.of(2026, 5, 10);
        Instant from = Instant.parse("2026-05-10T00:00:00Z");
        Instant to   = Instant.parse("2026-05-11T00:00:00Z");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findClosuresWithDetailsByStoreAndClosedAtBetween(storeId, from, to))
                .thenReturn(List.of());
        when(incidentRepository.findIncidentsWithContextByStoreAndCreatedAtBetween(storeId, from, to))
                .thenReturn(List.of());
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(storeId, from, to, SaleStatus.ACTIVE))
                .thenReturn(0L);
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(storeId, from, to, SaleStatus.CANCELLED))
                .thenReturn(0L);

        // Act
        DailyReportResponse response = dailyReportService.getDailyReport(storeId, date);

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

        assertThat(response.staffSummaries()).isEmpty();
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
        assertThatThrownBy(() -> dailyReportService.getDailyReport(unknownStoreId, LocalDate.of(2026, 5, 10)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Store not found");

        verify(shiftClosureRepository, never()).findClosuresWithDetailsByStoreAndClosedAtBetween(any(), any(), any());
        verify(incidentRepository, never()).findIncidentsWithContextByStoreAndCreatedAtBetween(any(), any(), any());
        verify(saleRepository, never()).countByStoreAndCreatedAtBetweenAndStatus(any(), any(), any(), any());
    }

    // -------------------------------------------------------------------------
    // Test 4: los repositorios reciben el rango correcto para un día concreto
    // -------------------------------------------------------------------------

    @Test
    void should_call_repositories_with_correct_day_range() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId, "Range Store");

        LocalDate date        = LocalDate.of(2026, 5, 10);
        Instant   expectedFrom = Instant.parse("2026-05-10T00:00:00Z");
        Instant   expectedTo   = Instant.parse("2026-05-11T00:00:00Z");

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(shiftClosureRepository.findClosuresWithDetailsByStoreAndClosedAtBetween(
                storeId, expectedFrom, expectedTo)).thenReturn(List.of());
        when(incidentRepository.findIncidentsWithContextByStoreAndCreatedAtBetween(
                storeId, expectedFrom, expectedTo)).thenReturn(List.of());
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(
                storeId, expectedFrom, expectedTo, SaleStatus.ACTIVE)).thenReturn(0L);
        when(saleRepository.countByStoreAndCreatedAtBetweenAndStatus(
                storeId, expectedFrom, expectedTo, SaleStatus.CANCELLED)).thenReturn(0L);

        // Act
        dailyReportService.getDailyReport(storeId, date);

        // Assert
        verify(shiftClosureRepository).findClosuresWithDetailsByStoreAndClosedAtBetween(
                storeId, expectedFrom, expectedTo);
        verify(incidentRepository).findIncidentsWithContextByStoreAndCreatedAtBetween(
                storeId, expectedFrom, expectedTo);
        verify(saleRepository).countByStoreAndCreatedAtBetweenAndStatus(
                storeId, expectedFrom, expectedTo, SaleStatus.ACTIVE);
        verify(saleRepository).countByStoreAndCreatedAtBetweenAndStatus(
                storeId, expectedFrom, expectedTo, SaleStatus.CANCELLED);
    }
}
