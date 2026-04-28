package com.shiftcontrol.backend.stores.controller;

import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.service.StoreService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    @GetMapping
    public List<Store> findAll() {
        return storeService.findAll();
    }
}
