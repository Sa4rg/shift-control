package com.shiftcontrol.backend.sales.dto;

import com.shiftcontrol.backend.sales.model.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreateSalePaymentRequest(

        @NotNull
        PaymentMethod method,

        @NotNull
        @Positive
        BigDecimal amount
) {
}