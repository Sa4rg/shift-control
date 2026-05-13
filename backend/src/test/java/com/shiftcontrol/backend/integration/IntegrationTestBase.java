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
import com.shiftcontrol.backend.sales.model.PaymentMethod;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SalePayment;
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
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    protected static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:16-alpine")
                    .withDatabaseName("shift_control_test")
                    .withUsername("test")
                    .withPassword("test");

    static {
        POSTGRES.start();
    }

    @Autowired protected MockMvc mockMvc;
    @Autowired protected StoreRepository storeRepository;
    @Autowired protected UserRepository userRepository;
    @Autowired protected ShiftRepository shiftRepository;
    @Autowired protected SaleRepository saleRepository;
    @Autowired protected ShiftClosureRepository shiftClosureRepository;
    @Autowired protected IncidentRepository incidentRepository;
    @Autowired protected JwtService jwtService;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
    }

    @BeforeEach
    void beforeEach() {
    }

    // =========================================================================
    // Store helpers
    // =========================================================================

    protected Store createStore() {
        Instant now = Instant.now();
        Store store = new Store();
        store.setName("Test Store " + UUID.randomUUID());
        store.setAddress("Test Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(now);
        store.setUpdatedAt(now);
        return storeRepository.save(store);
    }

    // =========================================================================
    // User helpers
    // =========================================================================

    protected User createAdmin() {
        Instant now = Instant.now();
        User admin = new User();
        admin.setFullName("Test Admin");
        admin.setUsername("test.admin." + UUID.randomUUID());
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

    protected User createAdminWithUsername(String username, String passwordHash) {
        Instant now = Instant.now();
        User admin = new User();
        admin.setFullName("Test Admin");
        admin.setUsername(username);
        admin.setEmail(null);
        admin.setPinHash(null);
        admin.setPasswordHash(passwordHash);
        admin.setRole(Role.ADMIN);
        admin.setStore(null);
        admin.setActive(true);
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        return userRepository.save(admin);
    }

    protected User createInactiveAdminWithUsername(String username, String passwordHash) {
        Instant now = Instant.now();
        User admin = new User();
        admin.setFullName("Inactive Test Admin");
        admin.setUsername(username);
        admin.setEmail(null);
        admin.setPinHash(null);
        admin.setPasswordHash(passwordHash);
        admin.setRole(Role.ADMIN);
        admin.setStore(null);
        admin.setActive(false);
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);
        return userRepository.save(admin);
    }

    protected User createStaff(Store store) {
        Instant now = Instant.now();
        User staff = new User();
        staff.setFullName("Test Staff");
        staff.setUsername("test.staff." + UUID.randomUUID());
        staff.setEmail(null);
        staff.setPinHash("test-pin-hash");
        staff.setPasswordHash(null);
        staff.setRole(Role.STAFF);
        staff.setStore(store);
        staff.setActive(true);
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);
        return userRepository.save(staff);
    }

    protected User createStaff(Store store, String fullName) {
        Instant now = Instant.now();
        User staff = new User();
        staff.setFullName(fullName);
        staff.setUsername("test.staff." + UUID.randomUUID());
        staff.setEmail(null);
        staff.setPinHash("test-pin-hash");
        staff.setPasswordHash(null);
        staff.setRole(Role.STAFF);
        staff.setStore(store);
        staff.setActive(true);
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);
        return userRepository.save(staff);
    }

    protected User createStaffWithUsername(Store store, String username, String pinHash) {
        Instant now = Instant.now();
        User staff = new User();
        staff.setFullName("Test Staff");
        staff.setUsername(username);
        staff.setEmail(null);
        staff.setPinHash(pinHash);
        staff.setPasswordHash(null);
        staff.setRole(Role.STAFF);
        staff.setStore(store);
        staff.setActive(true);
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);
        return userRepository.save(staff);
    }

    protected User createInactiveStaffWithUsername(Store store, String username, String pinHash) {
        Instant now = Instant.now();
        User staff = new User();
        staff.setFullName("Inactive Test Staff");
        staff.setUsername(username);
        staff.setEmail(null);
        staff.setPinHash(pinHash);
        staff.setPasswordHash(null);
        staff.setRole(Role.STAFF);
        staff.setStore(store);
        staff.setActive(false);
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);
        return userRepository.save(staff);
    }

    // =========================================================================
    // Shift helpers
    // =========================================================================

    protected Shift createOpenShift(User staff, Store store) {
        Instant now = Instant.now();
        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(store);
        shift.setType(ShiftType.DAY);
        shift.setStatus(ShiftStatus.OPEN);
        shift.setOpenedAt(now);
        shift.setClosedAt(null);
        shift.setClosedBy(null);
        shift.setCreatedAt(now);
        shift.setUpdatedAt(now);
        return shiftRepository.save(shift);
    }

    protected Shift createClosedShift(User staff, Store store, User closedBy, Instant closedAt) {
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

    // =========================================================================
    // Closure helpers
    // =========================================================================

    protected ShiftClosure createClosure(
            Shift shift, User closedBy,
            String totalCash, String totalMb, String totalGlovoOnline, String totalGlovoCash,
            String totalSales, String pendingInvoiceTotal,
            String cashToWithdraw, String expectedPhysicalCash,
            String confirmedCashAmount, String confirmedMbAmount,
            String cashDifference, String mbDifference,
            ClosureStatus status) {
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
        closure.setCashToWithdraw(new BigDecimal(cashToWithdraw));
        closure.setExpectedPhysicalCash(new BigDecimal(expectedPhysicalCash));
        closure.setConfirmedCashAmount(new BigDecimal(confirmedCashAmount));
        closure.setConfirmedMbAmount(new BigDecimal(confirmedMbAmount));
        closure.setCashDifference(new BigDecimal(cashDifference));
        closure.setMbDifference(new BigDecimal(mbDifference));
        closure.setStatus(status);
        closure.setNote(null);
        closure.setCreatedAt(now);
        closure.setUpdatedAt(now);
        return shiftClosureRepository.save(closure);
    }

    protected ShiftClosure createClosure(
            Shift shift, User closedBy,
            String totalCash, String totalMb, String totalGlovoOnline, String totalGlovoCash,
            String totalSales, String pendingInvoiceTotal,
            String cashDifference, String mbDifference,
            ClosureStatus status) {
        return createClosure(shift, closedBy,
                totalCash, totalMb, totalGlovoOnline, totalGlovoCash,
                totalSales, pendingInvoiceTotal,
                "0.00", "0.00", "0.00", "0.00",
                cashDifference, mbDifference, status);
    }

    // =========================================================================
    // Sale helpers
    // =========================================================================

    protected Sale createActiveCashSale(Shift shift, User staff, Store store, BigDecimal amount) {
        Instant now = Instant.now();
        Sale sale = new Sale();
        sale.setShift(shift);
        sale.setStaff(staff);
        sale.setStore(store);
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setInvoiceStatus(InvoiceStatus.PENDING);
        sale.setSubtotalAmount(amount);
        sale.setDiscountTotalAmount(new BigDecimal("0.00"));
        sale.setFinalTotalAmount(amount);
        sale.setNote(null);
        sale.setCancelledReason(null);
        sale.setCancelledAt(null);
        sale.setCreatedAt(now);
        sale.setUpdatedAt(now);
        SalePayment payment = new SalePayment();
        payment.setMethod(PaymentMethod.CASH);
        payment.setAmount(amount);
        sale.addPayment(payment);
        return saleRepository.save(sale);
    }

    protected Sale createSale(Store store, User staff, Shift shift, SaleStatus status, Instant createdAt) {
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
        sale.setCancelledAt(status == SaleStatus.CANCELLED ? createdAt : null);
        sale.setCreatedAt(createdAt);
        sale.setUpdatedAt(createdAt);
        return saleRepository.save(sale);
    }

    // =========================================================================
    // Incident helpers
    // =========================================================================

    protected Incident createIncident(User reportedBy, Shift shift, IncidentStatus status, Instant createdAt) {
        Incident incident = new Incident();
        incident.setReportedBy(reportedBy);
        incident.setShift(shift);
        incident.setClosure(null);
        incident.setSale(null);
        incident.setResolvedBy(null);
        incident.setType(IncidentType.OPERATIONAL_NOTE);
        incident.setStatus(status);
        incident.setSeverity(IncidentSeverity.LOW);
        incident.setTitle("Test incident");
        incident.setDescription("Test incident description.");
        incident.setResolutionNote(null);
        incident.setCreatedAt(createdAt);
        incident.setUpdatedAt(createdAt);
        incident.setResolvedAt(status == IncidentStatus.RESOLVED ? createdAt : null);
        return incidentRepository.save(incident);
    }

    protected Incident createIncident(User reportedBy, Shift shift, Instant createdAt) {
        return createIncident(reportedBy, shift, IncidentStatus.OPEN, createdAt);
    }
}