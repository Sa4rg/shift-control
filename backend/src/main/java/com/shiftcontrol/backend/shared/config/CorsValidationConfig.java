package com.shiftcontrol.backend.shared.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.Arrays;
import java.util.List;

/**
 * Validates CORS configuration at application startup.
 *
 * In staging and production profiles, CORS_ALLOWED_ORIGINS must be explicitly
 * configured. An empty or missing value will abort startup with a clear error.
 *
 * In development and test profiles, the check is skipped to allow local
 * operation without environment variable requirements.
 */
@Configuration
public class CorsValidationConfig {

    private static final List<String> STRICT_PROFILES = List.of("prod", "staging");

    private final CorsProperties corsProperties;
    private final Environment environment;

    public CorsValidationConfig(CorsProperties corsProperties, Environment environment) {
        this.corsProperties = corsProperties;
        this.environment = environment;
    }

    @PostConstruct
    public void validateCorsConfiguration() {
        boolean isStrictProfile = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(STRICT_PROFILES::contains);

        if (isStrictProfile && corsProperties.getAllowedOrigins().isEmpty()) {
            throw new IllegalStateException(
                    "CORS_ALLOWED_ORIGINS must be configured for staging/production"
            );
        }
    }
}
