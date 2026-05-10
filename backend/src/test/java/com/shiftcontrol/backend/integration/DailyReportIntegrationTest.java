package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.closures.model.ClosureStatus;
import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentSeverity;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.model.IncidentType;
import com.shiftcontrol.backend.incidents.repository.IncidentRepository;
import com.shiftcontrol.backend.sales.model.InvoiceStatus;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.sales.repository.SaleRepository;
import com.shiftcontrol.backend.shared.security.JwtService;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.model.ShiftType;
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DailyReportIntegrationTest extends IntegrationTestBase {

    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ShiftRepository shiftRepository;
    @Autowired private ShiftClosureRepository shiftClosureRepository;
    @Autowired private SaleRepository saleRepository;
    @Autowired private IncidentRepository incidentRepository;
    @Autowired private JwtService jwtService;

    // -------------------------------------------------------------------------
    // Test 1: admin recibe el reporte diario completo con todos los totales
    // -------------------------------------------------------------------------

    @Test
    void should_return_daily_report_for_admin() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staffA = createStaff(store, "Daily StaffA");
        User staffB = createStaff(store, "Daily StaffB");

        // Staff A — cierre 1 en 2026-05-10 (CLOSED_OK)
        Shift shiftA1 = createClosedShift(staffA, store, admin, Instant.parse("2026-05-10T10:00:00Z"));
        createClosure(shiftA1, admin,
                "40.00", "25.00", "15.00", "10.00",
                "90.00", "25.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Staff A — cierre 2 en 2026-05-10 (CLOSED_WITH_INCIDENT)
        Shift shiftA2 = createClosedShift(staffA, store, admin, Instant.parse("2026-05-10T12:00:00Z"));
        createClosure(shiftA2, admin,
                "20.00", "30.00", "0.00", "5.00",
                "55.00", "0.00",
                "-3.00", "2.00",
                ClosureStatus.CLOSED_WITH_INCIDENT);

        // Staff B — cierre en 2026-05-10 (CLOSED_OK)
        Shift shiftB = createClosedShift(staffB, store, admin, Instant.parse("2026-05-10T15:00:00Z"));
        createClosure(shiftB, admin,
                "100.00", "0.00", "0.00", "0.00",
                "100.00", "100.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Ventas en 2026-05-10 — 3 ACTIVE + 1 CANCELLED
        Instant inDay = Instant.parse("2026-05-10T11:00:00Z");
        createSale(store, staffA, shiftA1, SaleStatus.ACTIVE,    inDay);
        createSale(store, staffA, shiftA1, SaleStatus.ACTIVE,    inDay);
        createSale(store, staffB, shiftB,  SaleStatus.ACTIVE,    inDay);
        createSale(store, staffA, shiftA1, SaleStatus.CANCELLED, inDay);

        // Incidentes en 2026-05-10
        createIncident(staffA, shiftA1, IncidentStatus.OPEN,     Instant.parse("2026-05-10T10:30:00Z"));
        createIncident(staffA, shiftA2, IncidentStatus.RESOLVED, Instant.parse("2026-05-10T12:30:00Z"));
        createIncident(staffB, shiftB,  IncidentStatus.OPEN,     Instant.parse("2026-05-10T15:30:00Z"));

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/daily")
                        .param("storeId", store.getId().toString())
                        .param("date", "2026-05-10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Daily report retrieved successfully"))
                .andExpect(jsonPath("$.data.storeId").value(store.getId().toString()))
                .andExpect(jsonPath("$.data.storeName").value(store.getName()))
                .andExpect(jsonPath("$.data.date").value("2026-05-10"))
                .andExpect(jsonPath("$.data.totalCash").value(160.0))
                .andExpect(jsonPath("$.data.totalMb").value(55.0))
                .andExpect(jsonPath("$.data.totalGlovoOnline").value(15.0))
                .andExpect(jsonPath("$.data.totalGlovoCash").value(15.0))
                .andExpect(jsonPath("$.data.totalSales").value(245.0))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(125.0))
                .andExpect(jsonPath("$.data.cashDifferenceTotal").value(-3.0))
                .andExpect(jsonPath("$.data.mbDifferenceTotal").value(2.0))
                .andExpect(jsonPath("$.data.closuresCount").value(3))
                .andExpect(jsonPath("$.data.closedOkCount").value(2))
                .andExpect(jsonPath("$.data.closedWithIncidentCount").value(1))
                .andExpect(jsonPath("$.data.activeSalesCount").value(3))
                .andExpect(jsonPath("$.data.cancelledSalesCount").value(1))
                .andExpect(jsonPath("$.data.openIncidentsCount").value(2))
                .andExpect(jsonPath("$.data.resolvedIncidentsCount").value(1))
                .andExpect(jsonPath("$.data.staffSummaries.length()").value(2));
    }

    // -------------------------------------------------------------------------
    // Test 2: token STAFF es rechazado con 403
    // -------------------------------------------------------------------------

    @Test
    void should_reject_daily_report_for_staff() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store, "Daily Forbidden Staff");
        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/daily")
                        .param("storeId", store.getId().toString())
                        .param("date", "2026-05-10")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    // -------------------------------------------------------------------------
    // Test 3: storeId inexistente → 404
    // -------------------------------------------------------------------------

    @Test
    void should_return_not_found_when_store_does_not_exist() throws Exception {
        // Arrange
        User admin = createAdmin();
        String adminToken = jwtService.generateAccessToken(admin);
        UUID unknownStoreId = UUID.randomUUID();

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/daily")
                        .param("storeId", unknownStoreId.toString())
                        .param("date", "2026-05-10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Store not found"));
    }

    // -------------------------------------------------------------------------
    // Test 4: datos fuera de la fecha solicitada no se incluyen en el reporte
    // -------------------------------------------------------------------------

    @Test
    void should_exclude_data_outside_requested_date() throws Exception {
        // Arrange
        Store store = createStore();
        User admin = createAdmin();
        User staff = createStaff(store, "Daily Boundary Staff");

        // Cierre dentro de 2026-05-10
        Shift shiftInDay = createClosedShift(staff, store, admin, Instant.parse("2026-05-10T10:00:00Z"));
        createClosure(shiftInDay, admin,
                "100.00", "0.00", "0.00", "0.00",
                "100.00", "0.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        // Cierre fuera de 2026-05-10 (día siguiente)
        Shift shiftOutside = createClosedShift(staff, store, admin, Instant.parse("2026-05-11T10:00:00Z"));
        createClosure(shiftOutside, admin,
                "999.00", "0.00", "0.00", "0.00",
                "999.00", "0.00",
                "0.00", "0.00",
                ClosureStatus.CLOSED_OK);

        String adminToken = jwtService.generateAccessToken(admin);

        // Act + Assert
        mockMvc.perform(get("/api/admin/reports/daily")
                        .param("storeId", store.getId().toString())
                        .param("date", "2026-05-10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSales").value(100.0))
                .andExpect(jsonPath("$.data.closuresCount").value(1));
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store createStore() {
        Instant now = Instant.now();
        Store store = new Store();
        store.setName("Daily Report Store " + UUID.randomUUID());
        store.setAddress("Daily Report Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(now);
        store.setUpdatedAt(now);
        return storeRepository.save(store);
    }

    private User createAdmin() {
        Instant now = Instant.now();
        User admin = new User();
        admin.setFullName("Daily Report Admin");
        admin.setUsername("daily.admin." + UUID.randomUUID());
        admin.setEmail(null);
        admin.setPinHash(null);
        admin.setPasswordHash("hashed-password");
        admin.setRole(Role.ADMIN);
        admin.setStore(null);
        admin.setActive(true);
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        return userRepository.save(admin);
    }

    private User createStaff(Store store, String fullName) {
        Instant now = Instant.now();
        User staff = new User();
        staff.setFullName(fullName);
        staff.setUsername("daily.staff." + UUID.randomUUID());
        staff.setEmail(null);
        staff.setPinHash("hashed-pin");
        staff.setPasswordHash(null);
        staff.setRole(Role.STAFF);
        staff.setStore(store);
        staff.setActive(true);
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);
        return userRepository.save(staff);
    }

    private Shift createClosedShift(User staff, Store store, User closedBy, Instant closedAt) {
        Instant now = Instant.now();
        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(store);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.CLOSED);
        shift.setOpenedAt(closedAt.minusSeconds(3600));
        shift.setClosedAt(closedAt);
        shift.setClosedBy(closedBy);
        shift.setCreatedAt(now);
        shift.setUpdatedAt(now);
        return shiftRepository.save(shift);
    }

    private ShiftClosure createClosure(
            Shift shift,
            User closedBy,
            String totalCash,
            String totalMb,
            String totalGlovoOnline,
            String totalGlovoCash,
            String totalSales,
            String pendingInvoiceTotal,
            String cashDifference,
            String mbDifference,
            ClosureStatus status
    ) {
        Instant now = Instant.now();
        ShiftClosure closure = new ShiftClosure();
        closure.setShift(shift);
        closure.setClosedBy(closedBy);
        closure.setTotalCash(new BigDecimal(totalCash));
        closure.setTotalMb(new BigDecimal(totalMb));
        closure.setTotalGlovoOnline(new BigDecimal(totalGlovoOnline));
        closure.setTotalGlovoCash(new BigDecimal(totalGlovoCash));
        closure.setTotalSales(new BigDecimal(totalSales));
        closure.setPendingInvoiceTotal(new BigDecimal(pendingInvoiceTotal));
        closure.setCashToWithdraw(new BigDecimal("0.00"));
        closure.setExpectedPhysicalCash(new BigDecimal("0.00"));
        closure.setConfirmedCashAmount(new BigDecimal("0.00"));
        closure.setConfirmedMbAmount(new BigDecimal("0.00"));
        closure.setCashDifference(new BigDecimal(cashDifference));
        closure.setMbDifference(new BigDecimal(mbDifference));
        closure.setStatus(status);
        closure.setNote(null);
        closure.setCreatedAt(now);
        closure.setUpdatedAt(now);
        return shiftClosureRepository.save(closure);
    }

    private Sale createSale(Store store, User staff, Shift shift, SaleStatus status, Instant createdAt) {
        Sale sale = new Sale();
        sale.setStore(store);
        sale.setStaff(staff);
        sale.setShift(shift);
        sale.setStatus(status);
        sale.setInvoiceStatus(InvoiceStatus.PENDING);
        sale.setSubtotalAmount(new BigDecimal("10.00"));
        sale.setDiscountTotalAmount(new BigDecimal("0.00"));
        sale.setFinalTotalAmount(new BigDecimal("10.00"));
        sale.setNote(null);
        sale.setCancelledReason(status == SaleStatus.CANCELLED ? "Test cancellation" : null);
        sale.setCreatedAt(createdAt);
        sale.setUpdatedAt(createdAt);
        sale.setCancelledAt(status == SaleStatus.CANCELLED ? createdAt : null);
        return saleRepository.save(sale);
    }

    private Incident createIncident(User reportedBy, Shift shift, IncidentStatus status, Instant createdAt) {
        Incident incident = new Incident();
        incident.setReportedBy(reportedBy);
        incident.setShift(shift);
        incident.setClosure(null);
        incident.setSale(null);
        incident.setResolvedBy(null);
        incident.setType(IncidentType.OPERATIONAL_NOTE);
        incident.setStatus(status);
        incident.setSeverity(IncidentSeverity.LOW);
        incident.setTitle("Daily test incident");
        incident.setDescription("Incident for daily report test.");
        incident.setResolutionNote(null);
        incident.setCreatedAt(createdAt);
        incident.setUpdatedAt(createdAt);
        incident.setResolvedAt(status == IncidentStatus.RESOLVED ? createdAt : null);
        return incidentRepository.save(incident);
    }
}
