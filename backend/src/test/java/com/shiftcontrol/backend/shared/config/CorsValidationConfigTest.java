package com.shiftcontrol.backend.shared.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CorsValidationConfigTest {

    // -----------------------------------------------------------------------
    // Strict profiles: prod and staging
    // -----------------------------------------------------------------------

    @Test
    void prod_profile_with_empty_origins_fails_startup() {
        CorsProperties props = corsProperties(List.of());
        MockEnvironment env = activeProfiles("prod");

        CorsValidationConfig config = new CorsValidationConfig(props, env);

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                config::validateCorsConfiguration
        );
        assertTrue(ex.getMessage().contains("CORS_ALLOWED_ORIGINS must be configured for staging/production"));
    }

    @Test
    void staging_profile_with_empty_origins_fails_startup() {
        CorsProperties props = corsProperties(List.of());
        MockEnvironment env = activeProfiles("staging");

        CorsValidationConfig config = new CorsValidationConfig(props, env);

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                config::validateCorsConfiguration
        );
        assertTrue(ex.getMessage().contains("CORS_ALLOWED_ORIGINS must be configured for staging/production"));
    }

    // -----------------------------------------------------------------------
    // Strict profiles with configured origins should pass
    // -----------------------------------------------------------------------

    @Test
    void prod_profile_with_configured_origins_passes() {
        CorsProperties props = corsProperties(List.of("https://admin.example.com"));
        MockEnvironment env = activeProfiles("prod");

        CorsValidationConfig config = new CorsValidationConfig(props, env);

        assertDoesNotThrow(config::validateCorsConfiguration);
    }

    @Test
    void staging_profile_with_configured_origins_passes() {
        CorsProperties props = corsProperties(List.of("https://staging.example.com"));
        MockEnvironment env = activeProfiles("staging");

        CorsValidationConfig config = new CorsValidationConfig(props, env);

        assertDoesNotThrow(config::validateCorsConfiguration);
    }

    // -----------------------------------------------------------------------
    // Non-strict profiles: dev and test do not require CORS origins
    // -----------------------------------------------------------------------

    @Test
    void dev_profile_with_empty_origins_does_not_fail() {
        CorsProperties props = corsProperties(List.of());
        MockEnvironment env = activeProfiles("dev");

        CorsValidationConfig config = new CorsValidationConfig(props, env);

        assertDoesNotThrow(config::validateCorsConfiguration);
    }

    @Test
    void test_profile_with_empty_origins_does_not_fail() {
        CorsProperties props = corsProperties(List.of());
        MockEnvironment env = activeProfiles("test");

        CorsValidationConfig config = new CorsValidationConfig(props, env);

        assertDoesNotThrow(config::validateCorsConfiguration);
    }

    @Test
    void no_active_profile_with_empty_origins_does_not_fail() {
        CorsProperties props = corsProperties(List.of());
        MockEnvironment env = new MockEnvironment();

        CorsValidationConfig config = new CorsValidationConfig(props, env);

        assertDoesNotThrow(config::validateCorsConfiguration);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private static CorsProperties corsProperties(List<String> origins) {
        CorsProperties props = new CorsProperties();
        props.setAllowedOrigins(origins);
        return props;
    }

    private static MockEnvironment activeProfiles(String... profiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        return env;
    }
}
