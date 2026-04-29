package com.shiftcontrol.backend.stores.service;

import com.shiftcontrol.backend.stores.dto.CreateStoreRequest;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    public List<Store> findAll() {
        return storeRepository.findAll();
    }

    public Store createStore(CreateStoreRequest request) {
        Store store = new Store();
        store.setName(request.name());
        store.setAddress(request.address());
        store.setBaseCashAmount(request.baseCashAmount());
        store.setActive(true);
        store.setCreatedAt(Instant.now());
        store.setUpdatedAt(Instant.now());
        return storeRepository.save(store);
    }
}
