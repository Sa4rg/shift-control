package com.shiftcontrol.backend.shared.security;

import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String VALID_SECRET = "test-secret-that-is-at-least-32-bytes-long-for-jwt";

    private JwtProperties propertiesWith(String secret) {
        JwtProperties props = new JwtProperties();
        props.setSecret(secret);
        props.setAccessTokenExpirationSeconds(86400L);
        return props;
    }

    // -------------------------------------------------------------------------
    // Token generation and parsing
    // -------------------------------------------------------------------------

    @Test
    void should_generate_and_parse_access_token_with_valid_secret() {
        // Arrange
        JwtService jwtService = new JwtService(propertiesWith(VALID_SECRET));

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("ana.staff");
        user.setRole(Role.STAFF);

        // Act
        String token = jwtService.generateAccessToken(user);

        // Assert
        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUserId(token)).isEqualTo(user.getId());
        assertThat(jwtService.extractUsername(token)).isEqualTo("ana.staff");
        assertThat(jwtService.extractRole(token)).isEqualTo("STAFF");
    }

    // -------------------------------------------------------------------------
    // Secret validation
    // -------------------------------------------------------------------------

    @Test
    void should_reject_blank_secret() {
        assertThatThrownBy(() -> new JwtService(propertiesWith("")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("JWT secret must be configured and at least 32 bytes long");
    }

    @Test
    void should_reject_short_secret() {
        // "short" is 5 bytes, well under the 32-byte minimum
        assertThatThrownBy(() -> new JwtService(propertiesWith("short")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("JWT secret must be configured and at least 32 bytes long");
    }

    @Test
    void should_reject_insecure_fallback_secret() {
        assertThatThrownBy(() -> new JwtService(
                propertiesWith("change-this-secret-in-production-must-be-at-least-32-chars")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("JWT secret must be configured and at least 32 bytes long");
    }

    // -------------------------------------------------------------------------
    // Expiration validation
    // -------------------------------------------------------------------------

    @Test
    void should_reject_non_positive_access_token_expiration() {
        JwtProperties props = new JwtProperties();
        props.setSecret(VALID_SECRET);
        props.setAccessTokenExpirationSeconds(0L);

        assertThatThrownBy(() -> new JwtService(props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("JWT access token expiration seconds must be positive");
    }
}
