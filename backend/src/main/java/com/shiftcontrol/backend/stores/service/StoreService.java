package com.shiftcontrol.backend.stores.service;

import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.stores.dto.CreateStoreRequest;
import com.shiftcontrol.backend.stores.dto.UpdateStoreRequest;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class StoreService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    public StoreService(StoreRepository storeRepository, UserRepository userRepository) {
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
    }

    public List<Store> findAll() {
        return storeRepository.findAll();
    }

    public List<Store> searchStores(String search, boolean includeInactive) {
        if (search == null || search.isBlank()) {
            return includeInactive ? storeRepository.findAll() : storeRepository.findByActiveTrue();
        }
        String term = search.trim();
        return includeInactive
                ? storeRepository.searchByNameOrAddress(term)
                : storeRepository.searchActiveByNameOrAddress(term);
    }

    public Store getById(UUID id) {
        return storeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Store not found"));
    }

    public Store createStore(CreateStoreRequest request) {
        String name = request.name().trim();

        if (storeRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("Store name already exists");
        }

        Store store = new Store();
        store.setName(name);
        store.setAddress(request.address());
        store.setBaseCashAmount(request.baseCashAmount());
        store.setActive(true);
        store.setCreatedAt(Instant.now());
        store.setUpdatedAt(Instant.now());
        return storeRepository.save(store);
    }

    public Store updateStore(UUID id, UpdateStoreRequest request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Store not found"));

        String name = request.name().trim();
        String address = request.address().trim();

        storeRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BusinessException("Store name already exists");
            }
        });

        store.setName(name);
        store.setAddress(address);
        store.setBaseCashAmount(request.baseCashAmount());
        store.setUpdatedAt(Instant.now());
        return storeRepository.save(store);
    }

    @Transactional
    public Store deactivateStore(UUID id, UUID deactivatedById) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Store not found"));

        User deactivatedBy = userRepository.findById(deactivatedById)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!store.isActive()) {
            throw new BusinessException("Store is already inactive");
        }

        store.setActive(false);
        store.setDeactivatedBy(deactivatedBy);
        store.setDeactivatedAt(Instant.now());
        store.setUpdatedAt(Instant.now());
        return storeRepository.save(store);
    }
}
