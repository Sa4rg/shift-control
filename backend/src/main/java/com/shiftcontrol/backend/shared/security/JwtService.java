package com.shiftcontrol.backend.shared.security;

import com.shiftcontrol.backend.users.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String INSECURE_FALLBACK =
            "change-this-secret-in-production-must-be-at-least-32-chars";
    private static final int MIN_SECRET_BYTES = 32;

    private final String secret;
    private final long accessTokenExpirationSeconds;

    public JwtService(JwtProperties properties) {
        String s = properties.getSecret();
        if (s == null || s.isBlank()) {
            throw new IllegalStateException(
                    "JWT secret must be configured and at least 32 bytes long");
        }
        if (s.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT secret must be configured and at least 32 bytes long");
        }
        if (INSECURE_FALLBACK.equals(s)) {
            throw new IllegalStateException(
                    "JWT secret must be configured and at least 32 bytes long");
        }
        this.secret = s;
        long expiration = properties.getAccessTokenExpirationSeconds();
        if (expiration <= 0) {
            throw new IllegalStateException(
                    "JWT access token expiration seconds must be positive");
        }
        this.accessTokenExpirationSeconds = expiration;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(accessTokenExpirationSeconds);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("username", user.getUsername())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiration))
                .signWith(getSigningKey())
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(parseClaims(token).getSubject());
    }

    public String extractUsername(String token) {
        return parseClaims(token).get("username", String.class);
    }

    public String extractRole(String token) {
        return parseClaims(token).get("role", String.class);
    }
}
