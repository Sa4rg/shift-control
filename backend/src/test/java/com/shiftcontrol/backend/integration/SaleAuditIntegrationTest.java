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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleAuditIntegrationTest extends IntegrationTestBase {

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

    // -------------------------------------------------------------------------
    // Test: cancelling a sale sets cancelledBy audit field
    // -------------------------------------------------------------------------

    @Test
    void should_return_cancelled_by_when_staff_cancels_own_sale() throws Exception {
        // Arrange
        Store store = createStore();
        User staff = createStaff(store);
        Shift shift = createOpenShift(staff, store);
        Sale sale = createActiveCashSale(shift, staff, store, new BigDecimal("10.00"));

        String staffToken = jwtService.generateAccessToken(staff);

        // Act
        mockMvc.perform(patch("/api/sales/{id}/cancel", sale.getId())
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "  Customer changed order  "
                                }
                                """))
                // Assert — HTTP response
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sale cancelled successfully"))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelledReason").value("Customer changed order"))
                .andExpect(jsonPath("$.data.cancelledAt").isNotEmpty())
                .andExpect(jsonPath("$.data.cancelledById").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data.cancelledByName").value(staff.getFullName()));

        // Assert — persisted state via repository
        Sale saved = saleRepository.findWithDetailsById(sale.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(SaleStatus.CANCELLED);
        assertThat(saved.getCancelledBy()).isNotNull();
        assertThat(saved.getCancelledBy().getId()).isEqualTo(staff.getId());
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store createStore() {
        Instant now = Instant.now();
        Store store = new Store();
        store.setName("Audit Store " + UUID.randomUUID());
        store.setAddress("Audit Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(now);
        store.setUpdatedAt(now);
        return storeRepository.save(store);
    }

    private User createStaff(Store store) {
        Instant now = Instant.now();
        User staff = new User();
        staff.setFullName("Audit Staff");
        staff.setUsername("audit.staff." + UUID.randomUUID());
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

    private Sale createActiveCashSale(Shift shift, User staff, Store store, BigDecimal amount) {
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
}
