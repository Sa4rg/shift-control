package com.shiftcontrol.backend.integration;

import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SaleStatus;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleAuditIntegrationTest extends IntegrationTestBase {

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
}
