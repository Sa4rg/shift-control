package com.shiftcontrol.backend.sales.dto;

import com.shiftcontrol.backend.sales.model.PaymentMethod;
import com.shiftcontrol.backend.sales.model.SalePayment;

import java.math.BigDecimal;
import java.util.UUID;

public record SalePaymentResponse(
        UUID id,
        PaymentMethod method,
        BigDecimal amount
) {
    public static SalePaymentResponse fromEntity(SalePayment payment) {
        return new SalePaymentResponse(
                payment.getId(),
                payment.getMethod(),
                payment.getAmount()
        );
    }
}