package com.shiftcontrol.backend.stores.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateStoreRequest(

        @NotBlank
        @Size(max = 120)
        String name,

        @NotBlank
        @Size(max = 255)
        String address,

        @NotNull
        @Positive
        BigDecimal baseCashAmount
) {}
