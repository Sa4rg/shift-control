# =============================================================================
# Shift Control Backend — Production Dockerfile
# =============================================================================
# Multi-stage build:
#   Stage 1 (builder): Maven + JDK 21 — compiles and packages the fat jar.
#   Stage 2 (runtime): JRE 21 Debian slim — runs the jar as a non-root user.
#
# The runtime image uses eclipse-temurin:21-jre-jammy (Ubuntu 22.04 LTS) for
# maximum reliability with PostgreSQL JDBC and BouncyCastle on Railway and other hosted environments.
#
# PORT compatibility: server.port=${PORT:8080} in application.properties picks
# up the PORT env var injected by Railway or another hosting platform.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy dependency manifest first — Docker caches this layer until pom.xml changes.
COPY pom.xml .

# Pre-download all dependencies into the local repository cache.
# -B = batch mode (no progress output), -q = quiet
RUN mvn dependency:go-offline -B -q

# Copy application source.
COPY src ./src

# Package the application. Tests are skipped here; run ./mvnw test separately.
RUN mvn package -DskipTests -B -q

# -----------------------------------------------------------------------------
# Stage 2: Runtime
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy AS runtime

# Create a dedicated non-root system user and group to run the app.
RUN addgroup --system appgroup && adduser --system --ingroup appgroup --no-create-home appuser

WORKDIR /app

# Copy only the executable fat jar from the builder stage.
COPY --from=builder /app/target/backend-*.jar app.jar

# Transfer ownership to the non-root user.
RUN chown appuser:appgroup app.jar

USER appuser

# Railway (or another hosting platform) injects PORT; Spring Boot reads it via server.port=${PORT:8080}.
EXPOSE 8080

# Exec form ensures signals (SIGTERM) reach the JVM for graceful shutdown.
# -XX:+UseContainerSupport: respect cgroup memory limits (default in Java 11+, explicit here for clarity).
# -XX:MaxRAMPercentage=75.0: limit heap to 75% of container RAM; leaves room for non-heap and OS.
# -Djava.security.egd: use non-blocking entropy source for faster startup on Linux containers.
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "/app/app.jar"]
