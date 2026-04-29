package com.shiftcontrol.backend.shared.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

// TODO: This is a TEMPORARY development configuration.
// Replace entirely when implementing production auth:
//   - STAFF login: username + PIN (hashed), issues JWT
//   - ADMIN login: username + password (hashed), issues JWT
//   - STAFF endpoints: require ROLE_STAFF + valid JWT
//   - ADMIN endpoints: require ROLE_ADMIN + valid JWT
//   - Secrets must come from environment variables, never hardcoded
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                )
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        return http.build();
    }
}
