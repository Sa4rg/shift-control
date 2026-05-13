package com.shiftcontrol.backend.stores.repository;

import com.shiftcontrol.backend.stores.model.Store;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreRepository extends JpaRepository<Store, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Store> findByNameIgnoreCase(String name);

    // Override inherited methods to eagerly join deactivatedBy,
    // preventing LazyInitializationException when OSIV is disabled.

    @Override
    @EntityGraph(attributePaths = "deactivatedBy")
    List<Store> findAll();

    @Override
    @EntityGraph(attributePaths = "deactivatedBy")
    Optional<Store> findById(UUID id);

    @EntityGraph(attributePaths = "deactivatedBy")
    List<Store> findByActiveTrue();

    @EntityGraph(attributePaths = "deactivatedBy")
    @Query("""
            SELECT s FROM Store s
            WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.address) LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    List<Store> searchByNameOrAddress(@Param("search") String search);

    @EntityGraph(attributePaths = "deactivatedBy")
    @Query("""
            SELECT s FROM Store s
            WHERE s.active = true
              AND (
                LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(s.address) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    List<Store> searchActiveByNameOrAddress(@Param("search") String search);

    @EntityGraph(attributePaths = "deactivatedBy")
    List<Store> findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(String name, String address);
}
