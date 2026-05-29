package com.shiftcontrol.backend.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for login endpoint rate limiting.
 *
 * Rate limits are applied per IP address per login endpoint.
 * In-memory implementation: suitable for single-instance deployments (Render staging).
 * For multi-instance deployments, replace with Redis-backed rate limiting.
 */
@ConfigurationProperties(prefix = "app.security.rate-limit.login")
public class LoginRateLimitProperties {

    /**
     * Whether login rate limiting is active.
     * Set to false in test profile to avoid test interference.
     */
    private boolean enabled = true;

    /**
     * Duration of the rate limit window in seconds.
     * Counters reset after this period.
     */
    private int windowSeconds = 60;

    /**
     * Maximum login attempts allowed per IP per window for the staff login endpoint.
     */
    private int staffMaxAttempts = 10;

    /**
     * Maximum login attempts allowed per IP per window for the admin login endpoint.
     */
    private int adminMaxAttempts = 5;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getWindowSeconds() {
        return windowSeconds;
    }

    public void setWindowSeconds(int windowSeconds) {
        this.windowSeconds = windowSeconds;
    }

    public int getStaffMaxAttempts() {
        return staffMaxAttempts;
    }

    public void setStaffMaxAttempts(int staffMaxAttempts) {
        this.staffMaxAttempts = staffMaxAttempts;
    }

    public int getAdminMaxAttempts() {
        return adminMaxAttempts;
    }

    public void setAdminMaxAttempts(int adminMaxAttempts) {
        this.adminMaxAttempts = adminMaxAttempts;
    }
}
