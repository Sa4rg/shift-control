package com.shiftcontrol.backend.users.repository;

import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByActiveTrue();

    List<User> findByRole(Role role);

    List<User> findByRoleAndActiveTrue(Role role);
}
