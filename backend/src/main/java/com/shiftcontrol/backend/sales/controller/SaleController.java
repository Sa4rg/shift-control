package com.shiftcontrol.backend.sales.controller;

import com.shiftcontrol.backend.shared.exception.BusinessException;

import com.shiftcontrol.backend.sales.dto.CreateSaleRequest;
import com.shiftcontrol.backend.sales.dto.SaleResponse;
import com.shiftcontrol.backend.sales.dto.CancelSaleRequest;
import com.shiftcontrol.backend.sales.service.SaleService;
import com.shiftcontrol.backend.shared.response.ApiResponse;
import com.shiftcontrol.backend.users.model.Role;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sales")
public class SaleController {

    private final SaleService saleService;

    public SaleController(SaleService saleService) {
        this.saleService = saleService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SaleResponse> createSale(
            Authentication authentication,
            @Valid @RequestBody CreateSaleRequest request
    ) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());

        SaleResponse response = SaleResponse.fromEntity(
                saleService.createSale(authenticatedUserId, request)
        );

        return ApiResponse.ok("Sale created successfully", response);
    }

    @GetMapping("/{id}")
    public ApiResponse<SaleResponse> getById(
            Authentication authentication,
            @PathVariable UUID id
    ) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());
        Role authenticatedRole = extractRole(authentication);

        SaleResponse response = SaleResponse.fromEntity(
                saleService.getById(id, authenticatedUserId, authenticatedRole)
        );

        return ApiResponse.ok("Sale retrieved successfully", response);
    }

    @GetMapping
    public ApiResponse<List<SaleResponse>> listSales(
            Authentication authentication,
            @RequestParam(required = false) String shiftId
    ) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());

        if (!"current".equalsIgnoreCase(shiftId)) {
            throw new BusinessException("Only shiftId=current is supported for now");
        }

        List<SaleResponse> response = saleService.listCurrentShiftSales(authenticatedUserId)
                .stream()
                .map(SaleResponse::fromEntity)
                .toList();

        return ApiResponse.ok("Sales retrieved successfully", response);
    }

    @PatchMapping("/{id}/invoice")
    public ApiResponse<SaleResponse> markAsInvoiced(
            Authentication authentication,
            @PathVariable UUID id
    ) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());
        Role authenticatedRole = extractRole(authentication);

        SaleResponse response = SaleResponse.fromEntity(
                saleService.markAsInvoiced(id, authenticatedUserId, authenticatedRole)
        );

        return ApiResponse.ok("Sale marked as invoiced successfully", response);
    }

    @PatchMapping("/{id}/cancel")
    public ApiResponse<SaleResponse> cancelSale(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody CancelSaleRequest request
    ) {
        UUID authenticatedUserId = UUID.fromString(authentication.getName());
        Role authenticatedRole = extractRole(authentication);

        SaleResponse response = SaleResponse.fromEntity(
                saleService.cancelSale(id, request, authenticatedUserId, authenticatedRole)
        );

        return ApiResponse.ok("Sale cancelled successfully", response);
    }

    private Role extractRole(Authentication authentication) {
        String authority = authentication.getAuthorities()
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Authenticated user has no role"))
                .getAuthority();
        return Role.valueOf(authority.replace("ROLE_", ""));
    }
}