package com.shiftcontrol.backend.stores.repository;

import com.shiftcontrol.backend.stores.model.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StoreRepository extends JpaRepository<Store, UUID> {
}
