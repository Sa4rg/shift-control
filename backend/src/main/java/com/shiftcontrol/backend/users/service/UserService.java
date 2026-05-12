package com.shiftcontrol.backend.users.service;

import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.dto.CreateAdminRequest;
import com.shiftcontrol.backend.users.dto.CreateStaffRequest;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, StoreRepository storeRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User getById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    @Transactional
    public User deactivateUser(UUID id, UUID deactivatedByUserId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        User deactivatedBy = userRepository.findById(deactivatedByUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!user.isActive()) {
            throw new BusinessException("User is already inactive");
        }

        user.setActive(false);
        user.setDeactivatedBy(deactivatedBy);
        user.setDeactivatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        return userRepository.save(user);
    }

    public List<User> listUsers(Role role, boolean includeInactive) {
        if (role == null) {
            return includeInactive ? userRepository.findAll() : userRepository.findByActiveTrue();
        }
        return includeInactive ? userRepository.findByRole(role) : userRepository.findByRoleAndActiveTrue(role);
    }

    public User createStaff(CreateStaffRequest request) {
        String fullName = request.fullName().trim();
        String username = request.username().trim();

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new BusinessException("Username already exists");
        }

        Store store = storeRepository.findById(request.storeId())
                .orElseThrow(() -> new NotFoundException("Store not found"));

        if (!store.isActive()) {
            throw new BusinessException("Store is inactive");
        }

        User user = new User();
        user.setFullName(fullName);
        user.setUsername(username);
        user.setPinHash(passwordEncoder.encode(request.pin()));
        user.setPasswordHash(null);
        user.setRole(Role.STAFF);
        user.setStore(store);
        user.setActive(true);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        return userRepository.save(user);
    }

    public User createAdmin(CreateAdminRequest request) {
        String fullName = request.fullName().trim();
        String username = request.username().trim();
        String email = request.email().trim();

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new BusinessException("Username already exists");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Email already exists");
        }

        User user = new User();
        user.setFullName(fullName);
        user.setUsername(username);
        user.setEmail(email);
        user.setPinHash(null);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.ADMIN);
        user.setStore(null);
        user.setActive(true);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        return userRepository.save(user);
    }
}
