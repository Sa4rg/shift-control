package com.shiftcontrol.backend.stores.dto;

import com.shiftcontrol.backend.stores.model.Store;

import java.math.BigDecimal;
import java.util.UUID;

public record StoreResponse(
        UUID id,
        String name,
        String address,
        BigDecimal baseCashAmount,
        boolean active
) {
    public static StoreResponse fromEntity(Store store) {
        return new StoreResponse(
                store.getId(),
                store.getName(),
                store.getAddress(),
                store.getBaseCashAmount(),
                store.isActive()
        );
    }
}
