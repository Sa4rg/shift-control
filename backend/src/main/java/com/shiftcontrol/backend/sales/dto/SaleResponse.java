package com.shiftcontrol.backend.sales.dto;

import com.shiftcontrol.backend.sales.model.InvoiceStatus;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.model.SaleStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SaleResponse(
        UUID id,
        UUID shiftId,
        UUID staffId,
        String staffName,
        UUID storeId,
        String storeName,
        SaleStatus status,
        InvoiceStatus invoiceStatus,
        BigDecimal subtotalAmount,
        BigDecimal discountTotalAmount,
        BigDecimal finalTotalAmount,
        String note,
        String cancelledReason,
        Instant createdAt,
        Instant updatedAt,
        Instant cancelledAt,
        UUID cancelledById,
        String cancelledByName,
        List<SaleItemResponse> items,
        List<SaleDiscountResponse> discounts,
        List<SalePaymentResponse> payments
) {
    public static SaleResponse fromEntity(Sale sale) {
        return new SaleResponse(
                sale.getId(),
                sale.getShift().getId(),
                sale.getStaff().getId(),
                sale.getStaff().getFullName(),
                sale.getStore().getId(),
                sale.getStore().getName(),
                sale.getStatus(),
                sale.getInvoiceStatus(),
                sale.getSubtotalAmount(),
                sale.getDiscountTotalAmount(),
                sale.getFinalTotalAmount(),
                sale.getNote(),
                sale.getCancelledReason(),
                sale.getCreatedAt(),
                sale.getUpdatedAt(),
                sale.getCancelledAt(),
                sale.getCancelledBy() != null ? sale.getCancelledBy().getId() : null,
                sale.getCancelledBy() != null ? sale.getCancelledBy().getFullName() : null,
                sale.getItems().stream().map(SaleItemResponse::fromEntity).toList(),
                sale.getDiscounts().stream().map(SaleDiscountResponse::fromEntity).toList(),
                sale.getPayments().stream().map(SalePaymentResponse::fromEntity).toList()
        );
    }
}