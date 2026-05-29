package com.shiftcontrol.backend.shared.config;

import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Instant;

/**
 * Bootstraps the first ADMIN user on a clean database.
 *
 * Runs once on application startup, after Flyway migrations have been applied.
 * Disabled by default — must be explicitly enabled via:
 *   app.bootstrap.admin.enabled=true (or BOOTSTRAP_ADMIN_ENABLED=true)
 *
 * Intended use: first deployment to a clean staging or production database.
 * After the bootstrap admin is created, disable this runner immediately.
 *
 * Security guarantees:
 * - Runs only when explicitly enabled.
 * - Does nothing if an active ADMIN user already exists.
 * - Hashes the password with Argon2 before storage; plaintext is never persisted.
 * - Does not log the password at any level.
 *
 * See docs/phase-15-db-cloud-bootstrap.md for the full first-deploy sequence.
 */
@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    static final int MINIMUM_PASSWORD_LENGTH = 12;

    private final AdminBootstrapProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrapRunner(
            AdminBootstrapProperties properties,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.isEnabled()) {
            return;
        }

        validateProperties();

        boolean activeAdminExists = !userRepository.findByRoleAndActiveTrue(Role.ADMIN).isEmpty();

        if (activeAdminExists) {
            if (properties.isFailIfAdminExists()) {
                throw new IllegalStateException(
                        "Admin bootstrap is enabled but an active admin user already exists. " +
                        "Set app.bootstrap.admin.fail-if-admin-exists=false to skip silently, " +
                        "or set app.bootstrap.admin.enabled=false once the admin is in place."
                );
            }
            log.info("Bootstrap skipped — active admin already exists");
            return;
        }

        String username = properties.getUsername().trim();

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalStateException(
                    "Bootstrap admin username is already taken by an existing user: " + username
            );
        }

        createBootstrapAdmin(username);
    }

    private void validateProperties() {
        if (!StringUtils.hasText(properties.getUsername())) {
            throw new IllegalStateException(
                    "app.bootstrap.admin.username is required when admin bootstrap is enabled"
            );
        }
        if (!StringUtils.hasText(properties.getPassword())) {
            throw new IllegalStateException(
                    "app.bootstrap.admin.password is required when admin bootstrap is enabled"
            );
        }
        if (properties.getPassword().length() < MINIMUM_PASSWORD_LENGTH) {
            throw new IllegalStateException(
                    "app.bootstrap.admin.password must be at least " + MINIMUM_PASSWORD_LENGTH + " characters"
            );
        }
    }

    private void createBootstrapAdmin(String username) {
        Instant now = Instant.now();

        User admin = new User();
        admin.setFullName(resolveFullName());
        admin.setUsername(username);
        admin.setEmail(resolveEmail());
        admin.setPinHash(null);
        admin.setPasswordHash(passwordEncoder.encode(properties.getPassword()));
        admin.setRole(Role.ADMIN);
        admin.setStore(null);
        admin.setActive(true);
        admin.setCreatedAt(now);
        admin.setUpdatedAt(now);

        User saved = userRepository.save(admin);
        log.info("Bootstrap admin created successfully [userId={}]", saved.getId());
    }

    private String resolveFullName() {
        return StringUtils.hasText(properties.getFullName())
                ? properties.getFullName().trim()
                : "Initial Admin";
    }

    private String resolveEmail() {
        return StringUtils.hasText(properties.getEmail())
                ? properties.getEmail().trim()
                : null;
    }
}
