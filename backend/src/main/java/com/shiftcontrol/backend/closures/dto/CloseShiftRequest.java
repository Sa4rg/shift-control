package com.shiftcontrol.backend.closures.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CloseShiftRequest(

        @NotNull
        @PositiveOrZero
        BigDecimal confirmedCashAmount,

        @NotNull
        @PositiveOrZero
        BigDecimal confirmedMbAmount,

        @Size(max = 500)
        String note
) {
}