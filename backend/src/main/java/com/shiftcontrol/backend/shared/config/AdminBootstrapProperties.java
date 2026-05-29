package com.shiftcontrol.backend.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for the first-admin bootstrap mechanism.
 *
 * Bootstrap is disabled by default. It is intended for first deployment to a clean DB
 * (staging or production) where no ADMIN user exists yet.
 *
 * After the first ADMIN is created, set app.bootstrap.admin.enabled=false
 * (or BOOTSTRAP_ADMIN_ENABLED=false on Render) and restart the service.
 *
 * See docs/phase-15-db-cloud-bootstrap.md for full setup instructions.
 */
@ConfigurationProperties(prefix = "app.bootstrap.admin")
public class AdminBootstrapProperties {

    /**
     * Whether to run the admin bootstrap on startup.
     * Must be explicitly set to true to create the first admin.
     * Default: false (safe for all profiles).
     */
    private boolean enabled = false;

    /**
     * Username for the bootstrap admin.
     * Required when enabled=true.
     */
    private String username = "";

    /**
     * Plaintext password for the bootstrap admin.
     * Required when enabled=true. Minimum 12 characters.
     * Will be hashed using Argon2 before storage. Never stored in plaintext.
     */
    private String password = "";

    /**
     * Full name for the bootstrap admin.
     * Optional. Defaults to "Initial Admin".
     */
    private String fullName = "Initial Admin";

    /**
     * Email for the bootstrap admin.
     * Optional. May be left blank if email is not required by the current model.
     */
    private String email = "";

    /**
     * If true, the application will fail to start when bootstrap is enabled
     * and an active admin user already exists.
     * If false (default), it skips silently.
     */
    private boolean failIfAdminExists = false;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isFailIfAdminExists() { return failIfAdminExists; }
    public void setFailIfAdminExists(boolean failIfAdminExists) { this.failIfAdminExists = failIfAdminExists; }
}
