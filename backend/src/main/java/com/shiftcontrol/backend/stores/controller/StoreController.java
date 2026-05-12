package com.shiftcontrol.backend.stores.controller;

import com.shiftcontrol.backend.shared.response.ApiResponse;
import com.shiftcontrol.backend.stores.dto.CreateStoreRequest;
import com.shiftcontrol.backend.stores.dto.StoreResponse;
import com.shiftcontrol.backend.stores.dto.UpdateStoreRequest;
import com.shiftcontrol.backend.stores.service.StoreService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping({"", "/"})
    public ApiResponse<List<StoreResponse>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        List<StoreResponse> stores = storeService.searchStores(search, includeInactive)
                .stream()
                .map(StoreResponse::fromEntity)
                .toList();
        return ApiResponse.ok("Stores retrieved successfully", stores);
    }

    @GetMapping("/{id}")
    public ApiResponse<StoreResponse> findById(@PathVariable UUID id) {
        StoreResponse response = StoreResponse.fromEntity(storeService.getById(id));
        return ApiResponse.ok("Store retrieved successfully", response);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StoreResponse> create(@Valid @RequestBody CreateStoreRequest request) {
        StoreResponse response = StoreResponse.fromEntity(storeService.createStore(request));
        return ApiResponse.ok("Store created successfully", response);
    }

    @PatchMapping("/{id}")
    public ApiResponse<StoreResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateStoreRequest request) {
        StoreResponse response = StoreResponse.fromEntity(storeService.updateStore(id, request));
        return ApiResponse.ok("Store updated successfully", response);
    }

    @PatchMapping("/{id}/deactivate")
    public ApiResponse<StoreResponse> deactivateStore(
            Authentication authentication,
            @PathVariable UUID id
    ) {
        UUID deactivatedByUserId = UUID.fromString(authentication.getName());

        StoreResponse response = StoreResponse.fromEntity(
                storeService.deactivateStore(id, deactivatedByUserId)
        );

        return ApiResponse.ok("Store deactivated successfully", response);
    }
}
