package com.shiftcontrol.backend.shared.security;

import com.shiftcontrol.backend.shared.config.CorsProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private static final String UNAUTHORIZED_JSON =
            "{\"success\":false,\"message\":\"Unauthorized\",\"data\":null}";

    private static final String FORBIDDEN_JSON =
            "{\"success\":false,\"message\":\"Forbidden\",\"data\":null}";

    private final CorsProperties corsProperties;
    private final LoginRateLimitFilter loginRateLimitFilter;

    public SecurityConfig(CorsProperties corsProperties, LoginRateLimitFilter loginRateLimitFilter) {
        this.corsProperties = corsProperties;
        this.loginRateLimitFilter = loginRateLimitFilter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        if (!corsProperties.getAllowedOrigins().isEmpty()) {
            configuration.setAllowedOrigins(corsProperties.getAllowedOrigins());
        }
        configuration.setAllowedMethods(corsProperties.getAllowedMethods());
        configuration.setAllowedHeaders(corsProperties.getAllowedHeaders());
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter
    ) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(form -> form.disable())
                .httpBasic(httpBasic -> httpBasic.disable())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write(UNAUTHORIZED_JSON);
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write(FORBIDDEN_JSON);
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        // Health endpoint is public — required for Render health checks.
                        // All other actuator paths remain denied by anyRequest().denyAll() below.
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/staff/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/admin/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/stores").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/stores/**").hasRole("ADMIN")
                        // Defense-in-depth: resolve incident requires ADMIN at URL level.
                        // The service layer also enforces this rule independently.
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/resolve").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll()
                )
                // loginRateLimitFilter inserted first → runs before jwtAuthenticationFilter
                // (stable sort preserves insertion order for same-priority filters)
                .addFilterBefore(loginRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}