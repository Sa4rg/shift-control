package com.shiftcontrol.backend.integration;

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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ShiftClosureFlowIntegrationTest extends IntegrationTestBase {

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void should_close_shift_with_closed_ok_and_reject_sale_creation_after_closure() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert: close shift with matching amounts
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 148.00,
                                  "confirmedMbAmount": 0.00,
                                  "note": "End of day ok"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift closed successfully"))
                .andExpect(jsonPath("$.data.status").value("CLOSED_OK"))
                .andExpect(jsonPath("$.data.totalCash").value(45.00))
                .andExpect(jsonPath("$.data.totalMb").value(0.00))
                .andExpect(jsonPath("$.data.totalSales").value(45.00))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(45.00))
                .andExpect(jsonPath("$.data.cashToWithdraw").value(45.00))
                .andExpect(jsonPath("$.data.expectedPhysicalCash").value(148.00))
                .andExpect(jsonPath("$.data.cashDifference").value(0.00))
                .andExpect(jsonPath("$.data.mbDifference").value(0.00));

        // Act + Assert: after closing the shift, staff cannot create another sale
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "productName": "Product After Closure",
                                      "quantity": 1,
                                      "unitPrice": 10.00
                                    }
                                  ],
                                  "discounts": [],
                                  "payments": [
                                    {
                                      "method": "CASH",
                                      "amount": 10.00
                                    }
                                  ],
                                  "invoiceStatus": "PENDING",
                                  "note": "Should fail"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Staff has no open shift"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    private Store createStore() {
        Instant now = Instant.now();

        Store store = new Store();
        store.setName("Integration Store " + now.toEpochMilli());
        store.setAddress("Integration Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(now);
        store.setUpdatedAt(now);

        return storeRepository.save(store);
    }

    private User createStaff(Store store) {
        Instant now = Instant.now();

        User staff = new User();
        staff.setFullName("Integration Staff");
        staff.setUsername("integration.staff." + now.toEpochMilli());
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

    private Shift createOpenShift(User staff, Store store) {
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

    private Sale createCashSale(Shift shift, User staff, Store store, BigDecimal amount) {
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
        sale.setNote("Integration sale");
        sale.setCancelledReason(null);
        sale.setCreatedAt(now);
        sale.setUpdatedAt(now);
        sale.setCancelledAt(null);

        SalePayment payment = new SalePayment();
        payment.setMethod(PaymentMethod.CASH);
        payment.setAmount(amount);

        sale.addPayment(payment);

        return saleRepository.save(sale);
    }

    @Test
    void should_close_shift_with_incident_when_amounts_do_not_match() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Act + Assert
        // expectedPhysicalCash = 103.00 + 45.00 = 148.00
        // cashDifference = 150.00 - 148.00 = 2.00
        // mbDifference   = 10.00  - 0.00   = 10.00  → CLOSED_WITH_INCIDENT
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 150.00,
                                  "confirmedMbAmount": 10.00,
                                  "note": "Amounts do not match"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Shift closed successfully"))
                .andExpect(jsonPath("$.data.status").value("CLOSED_WITH_INCIDENT"))
                .andExpect(jsonPath("$.data.totalCash").value(45.00))
                .andExpect(jsonPath("$.data.totalMb").value(0.00))
                .andExpect(jsonPath("$.data.totalSales").value(45.00))
                .andExpect(jsonPath("$.data.pendingInvoiceTotal").value(45.00))
                .andExpect(jsonPath("$.data.cashToWithdraw").value(45.00))
                .andExpect(jsonPath("$.data.expectedPhysicalCash").value(148.00))
                .andExpect(jsonPath("$.data.cashDifference").value(2.00))
                .andExpect(jsonPath("$.data.mbDifference").value(10.00));
    }

    @Test
    void should_reject_second_close_attempt() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        createCashSale(shift, staff, store, new BigDecimal("45.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Act 1: first close — should succeed
        // expectedPhysicalCash = 103.00 + 45.00 = 148.00 → amounts match → CLOSED_OK
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 148.00,
                                  "confirmedMbAmount": 0.00,
                                  "note": "First close"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED_OK"));

        // Act 2: second close attempt on same shift — should be rejected
        mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "confirmedCashAmount": 148.00,
                                  "confirmedMbAmount": 0.00,
                                  "note": "Second close"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Shift is already closed"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }
}