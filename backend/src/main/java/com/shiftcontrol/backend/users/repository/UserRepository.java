package com.shiftcontrol.backend.users.repository;

import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @EntityGraph(attributePaths = "deactivatedBy")
    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    // Override inherited methods to eagerly join deactivatedBy (and store via store association
    // on User), preventing LazyInitializationException when OSIV is disabled.

    @Override
    @EntityGraph(attributePaths = {"store", "deactivatedBy"})
    List<User> findAll();

    @Override
    @EntityGraph(attributePaths = {"store", "deactivatedBy"})
    Optional<User> findById(UUID id);

    @EntityGraph(attributePaths = {"store", "deactivatedBy"})
    List<User> findByActiveTrue();

    @EntityGraph(attributePaths = {"store", "deactivatedBy"})
    List<User> findByRole(Role role);

    @EntityGraph(attributePaths = {"store", "deactivatedBy"})
    List<User> findByRoleAndActiveTrue(Role role);
}
