# Production Readiness Audit — Shift Control
**Fecha:** 28 Mayo 2026 | **Tipo:** Solo auditoría — sin implementación

---

## 1. Stack Real Detectado

| Componente | Tecnología real | Evidencia |
|---|---|---|
| Lenguaje backend | Java 21 | `pom.xml` → `<java.version>21</java.version>` |
| Framework backend | Spring Boot 4.0.6 | `pom.xml` → `spring-boot-starter-parent 4.0.6` |
| API style | Spring MVC REST (`spring-boot-starter-webmvc`) | `pom.xml` |
| ORM | Spring Data JPA + Hibernate | `spring-boot-starter-data-jpa` |
| Base de datos | PostgreSQL 16 | `docker-compose.yml`, `flyway-database-postgresql` |
| Migraciones | Flyway | `spring-boot-starter-flyway`, 13 migrations en `db/migration/` |
| Seguridad | Spring Security + JWT (JJWT 0.12.6) | `SecurityConfig.java`, `JwtService.java` |
| Password hashing | Argon2 (Spring Security `v5_8` defaults) | `PasswordEncoderConfig.java` |
| Build | Maven Wrapper (`mvnw`) | `mvnw`, `mvnw.cmd` |
| Testing backend | JUnit 5 + Testcontainers 2.0.5 + MockMvc | `pom.xml` |
| CI | Jenkins (Dockerfile en `jenkins-local/`) | `Jenkinsfile`, `jenkins-local/docker-compose.yml` |
| Mobile framework | Expo SDK 54 / React Native 0.81.5 | `package.json` |
| Mobile lenguaje | TypeScript 5.9.2 | `tsconfig.json`, `package.json` |
| Mobile routing | Expo Router 6.0.23 | `package.json` |
| Mobile HTTP client | Axios 1.16.1 | `package.json` |
| Mobile token storage | expo-secure-store 15.0.8 | `token.ts`, `app.json` plugins |
| Mobile testing | Jest 29 + jest-expo 54 | `package.json` |
| Estructura | Monorepo manual (no pnpm workspaces globales, workspace en `shift-control-mobile/`) | `pnpm-workspace.yaml` |
| Infraestructura local | Docker Compose (solo PostgreSQL) | `docker-compose.yml` |

**Confirmado: NO MySQL, NO Knex. Stack es PostgreSQL + Flyway + Hibernate exactamente como se esperaba.**

---

## 2. Estado Actual por Área

| Área | Estado | Evidencia encontrada | Riesgo | Recomendación |
|---|---|---|---|---|
| **Profiles dev/prod/staging** | Parcial | `application.properties`, `application-dev.properties`, `application-prod.properties`, `application-test.properties` existen. No hay `staging`. | Medio | Crear perfil `staging` antes del deploy. Decidir si staging = prod-like config. |
| **Variables de entorno** | Parcial | `application.properties` lee `${JWT_SECRET}` y `${JWT_EXPIRATION_SECONDS}`. `application-prod.properties` requiere `${DATABASE_URL}`, `${DATABASE_USERNAME}`, `${DATABASE_PASSWORD}`, `${CORS_ALLOWED_ORIGINS}`. Sin fallback en prod. | Medio | OK en prod. Falta documentar variables requeridas en `.env.example` o README. |
| **Secrets fuera del repo** | **Riesgo detectado** | `application-dev.properties` contiene credenciales de DB en texto plano (`shift_control_password`). `.gitignore` raíz lista estos archivos como ignorados, PERO los archivos existen en el workspace. Si fueron commiteados antes de agregar la regla al `.gitignore`, están en el historial de git. | **Alto** | Verificar `git log --all -- backend/src/main/resources/application-dev.properties`. Si fue commiteado, limpiar el historial. Siempre usar `--skip-worktree` o git-secrets. |
| **.env.example o documentación equivalente** | Pendiente | No existe `.env.example` ni en raíz ni en backend. Las variables requeridas no están documentadas en un solo lugar. | Medio | Crear `backend/.env.example` con todas las variables requeridas (sin valores reales). |
| **Configuración DB** | OK | `application-prod.properties` requiere `${DATABASE_URL}`, `${DATABASE_USERNAME}`, `${DATABASE_PASSWORD}` sin fallback. `application-dev.properties` tiene config local. | Bajo | OK. Considerar usar JDBC URL separado vs propiedades individuales según el cloud provider. |
| **Database cloud readiness** | Pendiente | No existe Dockerfile de backend, no existe `docker-compose.prod.yml`, no hay configuración de cloud DB (RDS, Supabase, etc.). | Alto | Decisión arquitectural necesaria: ¿dónde vive la DB en producción? |
| **Migraciones Flyway limpias** | OK | 13 migraciones (`V1__` → `V13__`), ordenadas, sin saltos, sin `INSERT` de datos reales. Flyway habilitado en `application.properties`. `ddl-auto=validate` — Hibernate no toca el esquema. | Bajo | Excelente práctica. No hay nada que limpiar. |
| **Seed / admin inicial** | Pendiente | No existe ningún script de seed ni migration con datos iniciales. No hay mecanismo para crear el primer usuario ADMIN. | **Alto** | Necesita un script de bootstrap seguro para crear el primer ADMIN en producción. |
| **Backup strategy** | No encontrado | Nada relacionado con backups en el proyecto. | Alto | Definir antes de producción: dumps automáticos, PITR si se usa RDS, etc. |
| **CORS real** | Parcial | `SecurityConfig` lee `corsProperties.getAllowedOrigins()`. `application-prod.properties` usa `${CORS_ALLOWED_ORIGINS:}` — si la variable está vacía, `allowedOrigins` será lista vacía. Ver nota abajo. | **Alto** | Ver análisis CORS detallado. Un `allowedOrigins` vacío puede bloquear todos los requests o habilitarlos todos según la implementación. |
| **HTTPS readiness** | Pendiente | No existe configuración TLS/SSL en el backend. No hay Nginx/proxy definido. `EXPO_PUBLIC_API_BASE_URL` en `.env.local` apunta a HTTP. | Alto | Definir estrategia: TLS en Spring directamente, o terminación en proxy/load balancer. |
| **JWT secret** | OK en prod | `application-prod.properties`: `${JWT_SECRET}` sin fallback. `JwtService` valida en constructor que el secret no sea nulo, esté presente, ≥32 bytes, y no sea el valor de fallback. App falla al arrancar si no está configurado. | Bajo | Muy buena práctica — fail-fast. El dev secret (`local-dev-jwt-secret-must-be-at-least-32-bytes`) en `application-dev.properties` es aceptable solo para desarrollo local. |
| **JWT expiration** | Parcial | Prod: 3600s (1h) por defecto, configurable via `${JWT_EXPIRATION_SECONDS}`. Dev: 86400s (24h). No hay refresh tokens. | Medio | Sin refresh tokens, la sesión expira y el usuario debe re-loginear. Documentar este comportamiento. Decisión pendiente sobre refresh tokens antes de prod. |
| **Password/PIN hashing** | OK | Argon2 (`Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()`). BCrypt hubiera sido aceptable pero Argon2 es el estado del arte. | Bajo | Ninguna acción necesaria. |
| **Admin authorization** | OK | `/api/admin/**` protegido con `hasRole("ADMIN")` a nivel de `SecurityFilterChain`. `POST /api/stores` y `PATCH /api/stores/**` también requieren ADMIN. | Bajo | El filter-level protection es correcto. Se complementa con service-level checks. |
| **Staff authorization / ownership** | OK | Los services (`ShiftService`, `SaleService`, `IncidentService`) verifican role y propiedad: si rol es STAFF, solo accede a sus propios recursos. | Bajo | Ver sección 4 para análisis detallado. |
| **Rate limiting login** | **No encontrado** | No existe rate limiting en ningún endpoint. No hay Spring Security rate limiter, no hay Bucket4j, no hay ningún filtro custom. | **Alto** | Endpoint de login vulnerable a fuerza bruta. Implementar antes de producción. |
| **Input validation** | OK | `@Valid` aplicado en todos los `@RequestBody` que lo requieren. `GlobalExceptionHandler` maneja `MethodArgumentNotValidException` devolviendo 400. Validaciones en DTOs con Bean Validation. | Bajo | Buena práctica. Revisar constraints específicos en DTOs de login (longitud de PIN, etc.). |
| **Error handler global** | OK | `GlobalExceptionHandler` con `@RestControllerAdvice` captura: validación, params faltantes, tipos incorrectos, body ilegible, `BusinessException`, `NotFoundException`, y `Exception` (catch-all). | Bajo | Catch-all de `Exception` devuelve mensaje genérico — correcto. |
| **No stack traces en producción** | OK | `server.error.include-stacktrace=never`, `server.error.include-message=never`, `server.error.include-binding-errors=never` en `application.properties` (base, aplica a todos los profiles). | Bajo | Excelente. Ninguna acción necesaria. |
| **Logging útil** | **Pendiente** | No existe ninguna configuración de logging en `application.properties` ni `application-prod.properties`. No hay `@Slf4j` ni `LoggerFactory` en ningún servicio. No hay logback.xml. | **Alto** | Se usan por defecto los logs de Spring Boot. En producción no hay trazabilidad de eventos críticos (login fallido, shift creado, closure procesada). |
| **No logging de secrets/tokens/PIN** | OK por omisión | Al no haber logging manual, no se loguean tokens ni PINs. Pero la ausencia de logs es el problema mayor. | Bajo | Al implementar logging, asegurarse de no loguear headers `Authorization`, `pin`, `password`. |
| **Health endpoint** | **No encontrado** | No existe `spring-boot-starter-actuator` en `pom.xml`. No hay endpoint `/health` ni `/actuator/health`. | **Alto** | Sin health check, no se puede hacer deploy con zero-downtime ni monitoreo básico. |
| **Readiness endpoint con DB** | No encontrado | Mismo punto anterior — sin actuator no hay readiness probe. | Alto | Requiere decisión: actuator completo vs endpoint simple custom. |
| **Dockerfile backend** | **No encontrado** | Solo existe `jenkins-local/Dockerfile` (para Jenkins, no para el backend). No hay `Dockerfile` ni `Dockerfile.backend`. | **Alto** | Bloqueante para cualquier deploy containerizado. |
| **docker-compose local/prod-like** | Parcial | `docker-compose.yml` levanta solo PostgreSQL. No hay `docker-compose.override.yml` ni `docker-compose.prod.yml` con el backend. | Medio | Suficiente para desarrollo local. Falta para staging/prod. |
| **CI/CD** | Parcial | Jenkins local funcional (`Jenkinsfile` + `jenkins-local/`). Solo corre `./mvnw test` en backend. No testea mobile. No hace build de producción. No hace deploy. | Medio | CI básico OK. CD no existe. Mobile no incluido en pipeline. |
| **Mobile env profiles** | Parcial | Solo existe `.env.local` con IP local (`http://10.103.237.125:8080`). `env.ts` valida que `EXPO_PUBLIC_API_BASE_URL` esté presente, lanzando error si no. No hay `.env.production`. | Alto | Crear `.env.production` con URL HTTPS real antes de build de producción. |
| **Mobile SecureStore/token storage** | OK | `expo-secure-store` usado correctamente en `token.ts`. Token guardado, leído y borrado via `SecureStore`. Incluido como plugin en `app.json`. | Bajo | Ninguna acción necesaria. |
| **Mobile API base URL prod/dev** | Parcial | Solo hay una URL configurada en `.env.local` (dev). No hay distinción automática por entorno en el build. | Alto | Configurar `EXPO_PUBLIC_API_BASE_URL` por profile EAS cuando se configure EAS. |
| **Mobile no secrets en bundle** | OK | La única variable `EXPO_PUBLIC_API_BASE_URL` es una URL, no un secret. No hay API keys, tokens ni passwords en el código mobile. | Bajo | Correcto. `EXPO_PUBLIC_*` son visibles en el bundle — solo para URLs no-secretas está bien. |
| **Dependency/security audit** | Pendiente | No se ha corrido `pnpm audit` ni `./mvnw dependency-check`. No hay configuración de OWASP Dependency-Check en el pipeline. | Medio | Correr antes de producción. Spring Boot 4.0.6 es reciente. JJWT 0.12.6 es la versión actual. |

---

## 3. OWASP Coverage

| Riesgo OWASP | Aplica a Shift Control | Estado actual | Acción recomendada |
|---|---|---|---|
| **A01 — Broken Access Control** | Sí — STAFF no debe ver datos de otros staff ni de admin | **Parcial/OK** — SecurityFilterChain protege `/api/admin/**`. Services implementan ownership checks por role. | Verificar que `/api/shifts/{id}` de un staff no acceda al shift de otro staff (ver sección 4). |
| **A02 — Cryptographic Failures** | Sí — Passwords/PINs, JWT secret, datos en tránsito | **Parcial** — Argon2 para hashing (OK), JWT con HMAC-SHA (OK), pero NO hay HTTPS configurado. | Configurar TLS antes de producción. Sin HTTPS, tokens y PINs van en texto plano por red. |
| **A03 — Injection** | Sí — Spring Data JPA con queries JPQL/HQL | **OK** — JPA/Hibernate con parámetros named previene SQL injection. No se detectaron queries concatenadas con strings. | Mantener el uso de repositorios Spring Data. No introducir queries nativas sin parámetros. |
| **A04 — Insecure Design** | Parcial — No hay seed admin, no hay refresh tokens | **Pendiente** — No existe mecanismo seguro para bootstrap del primer admin. | Diseñar proceso de bootstrap controlado. Documentar ausencia de refresh tokens. |
| **A05 — Security Misconfiguration** | Sí — CORS vacío en prod, devtools en prod, profiles | **Riesgo** — `spring-boot-devtools` está como dependencia `runtime:optional`. `CORS_ALLOWED_ORIGINS` vacío en prod tiene comportamiento ambiguo. | Verificar que devtools no esté activo en prod. Definir CORS_ALLOWED_ORIGINS explícitamente. |
| **A06 — Vulnerable Components** | Sí — Spring Boot 4.0.6 muy reciente, JJWT, Argon2/Bouncy Castle 1.79 | **Pendiente** — No se ha corrido `dependency-check`. Spring Boot 4.0.6 es tan nuevo que su historial de CVEs es corto. | Correr OWASP Dependency Check. Mantener actualizaciones activas. |
| **A07 — Identification and Authentication Failures** | Sí — Login sin rate limiting | **Riesgo alto** — Sin rate limiting en `/api/auth/staff/login` y `/api/auth/admin/login`. Mensajes de error genéricos OK (OWASP compliant). Argon2 OK. | Implementar rate limiting antes de producción. |
| **A08 — Software and Data Integrity Failures** | Parcial — No hay verificación de integridad de build | **Pendiente** — No hay firma de JARs, no hay checksum de imágenes Docker, no hay verificación de supply chain. | Bajo riesgo para MVP interno. Documentar para producción futura. |
| **A09 — Security Logging and Monitoring Failures** | Sí — Sistema interno, necesita trazabilidad | **Riesgo alto** — No existe logging estructurado de eventos de seguridad. Login exitoso/fallido no se loguea. No hay alertas. | Implementar logging de eventos críticos: login fallido, acceso denegado, closure procesada. |
| **A10 — Server-Side Request Forgery** | No aplica directamente | El backend no realiza requests a URLs proporcionadas por usuarios. | Ninguna acción necesaria en MVP. |
| **API1 — Broken Object Level Auth** | Sí — Shift/Sale/Incident por ID | **Parcial/OK** — Services verifican ownership. Ver sección 4 para análisis completo. | Verificar todos los endpoints `/{id}` pasan el `authenticatedUserId` al service. |
| **API2 — Broken Authentication** | Sí | **Parcial** — JWT validado en filter, secret validado en startup. Sin rate limiting es el gap. | Rate limiting en login. |
| **API3 — Broken Object Property Level Auth** | Parcial | No se detectaron campos sensibles expuestos en respuestas. `pinHash`/`passwordHash` no están en `UserResponse`. | Confirmar que ningún DTO response expone `pinHash` o `passwordHash`. |
| **API4 — Unrestricted Resource Consumption** | Sí | **Riesgo** — Sin rate limiting, sin paginación, sin límite de tamaño de payload. Endpoints de lista devuelven colecciones completas. | Rate limiting. Considerar paginación en colecciones grandes para producción. |
| **API8 — Security Misconfiguration** | Ver A05 | CORS ambiguo en prod. Devtools. | Ver A05. |
| **Mobile M1 — Improper Platform Usage** | Sí | **OK** — expo-secure-store para tokens. No se usa AsyncStorage para datos sensibles. | Ninguna acción. |
| **Mobile M2 — Insecure Data Storage** | Sí | **OK** — SecureStore para tokens. Sin datos sensibles en estado persistente. | Confirmar que no se guardan PINs/passwords en ninguna parte del estado o storage. |
| **Mobile M3 — Insecure Communication** | Sí | **Riesgo** — `.env.local` apunta a `http://` (sin TLS). En producción debe ser HTTPS. | Configurar URL HTTPS en `.env.production`. Considerar Certificate Pinning para app interna. |
| **Mobile M4 — Insecure Authentication** | Sí | **OK** — Token manejado correctamente. Logout borra token. 401 interceptor borra token y notifica. | Ninguna acción en mobile. |
| **Mobile M9 — Improper Credential Usage** | Sí | **OK** — No hay credenciales hardcodeadas en código mobile. `EXPO_PUBLIC_API_BASE_URL` es solo una URL. | Confirmar en build de producción que la URL sea HTTPS. |

---

## 4. Revisión Específica de Autorización

### SecurityFilterChain — nivel de URL

```
POST /api/auth/staff/login  → permitAll
POST /api/auth/admin/login  → permitAll
GET  /api/auth/me           → authenticated (cualquier rol)
POST /api/stores            → hasRole("ADMIN")
PATCH /api/stores/**        → hasRole("ADMIN")
/api/admin/**               → hasRole("ADMIN")
/api/**                     → authenticated
anyRequest                  → denyAll
```

**Observación crítica:** `GET /api/stores` y `GET /api/stores/{id}` están bajo `/api/**` → solo requieren `authenticated`. No requieren ADMIN. Ambos roles pueden listar y ver tiendas. Esto es intencional (el mobile de staff necesita ver la tienda), pero debe documentarse explícitamente.

### Service-level authorization — análisis por módulo

**ShiftController → ShiftService:**
- `POST /api/shifts/open` — el `staffId` se extrae del `Authentication`, no del body. Un staff no puede abrir un shift para otro staff. ✅
- `GET /api/shifts/current` — extrae `staffId` del token. ✅
- `GET /api/shifts/{id}` — pasa `authenticatedUserId` y `authenticatedRole` al service. `getById` verificará ownership. ✅
- `GET /api/shifts` — pasa `authenticatedUserId` y `authenticatedRole`. Service filtra por rol. ✅

**SaleController → SaleService:**
- `POST /api/sales` — `authenticatedUserId` del token. El service verifica que el shiftId pertenece al staff. ✅
- `GET /api/sales/{id}` — pasa `authenticatedUserId` y `authenticatedRole`. ✅
- `GET /api/sales` — pasa `authenticatedUserId` y `authenticatedRole`. ✅
- `PATCH /api/sales/{id}/invoice` — pasa `authenticatedUserId` y `authenticatedRole`. ✅
- `PATCH /api/sales/{id}/cancel` — pasa `authenticatedUserId` y `authenticatedRole`. ✅

**IncidentController → IncidentService:**
- `POST /api/incidents` — `reportedByUserId` del token. Service valida acceso al shift/closure/sale referenciado vía `validateIncidentAccess()`. **Requiere revisión manual de esta función.**
- `GET /api/incidents` — pasa `authenticatedUserId` y `authenticatedRole`. Service usa `findStaffFiltered` para STAFF (solo sus propios) o `findAdminFiltered` para ADMIN. ✅
- `GET /api/incidents/{id}` — pasa ambos, llama `validateIncidentReadAccess()`. **Requiere revisión manual.**
- `PATCH /api/incidents/{id}/resolve` — service verifica explícitamente `resolvedBy.getRole() != Role.ADMIN` y lanza `BusinessException`. ✅

**Observación importante:** `PATCH /api/incidents/{id}/resolve` NO está bajo `/api/admin/**`. Está bajo `/api/incidents/{id}/resolve`. La protección depende SOLO del service-level check. El filtro de URL no protege este endpoint como ADMIN. Si el service-level check falla, cualquier STAFF autenticado podría intentar resolverlo. El service hace el check correctamente — pero es una capa de protección, no dos. **Recomendación:** añadir este endpoint a las reglas de URL en `SecurityConfig` o moverlo a `/api/admin/incidents/{id}/resolve`.

**WeeklyAdminReviewController:**
- Está bajo `/api/admin/weekly-reviews` → protegido por `hasRole("ADMIN")` en el filter. ✅

**UserController:**
- Está bajo `/api/admin/users` → protegido. ✅

---

## 5. Revisión Específica de Autenticación

| Item | Estado | Evidencia |
|---|---|---|
| Login staff | OK | `AuthService.loginStaff()`: busca user, verifica `STAFF`, verifica `active`, verifica PIN con `passwordEncoder.matches()`. |
| Login admin | OK | `AuthService.loginAdmin()`: mismo patrón, verifica `ADMIN`, verifica password. |
| Error messages | OK (OWASP) | Todos los casos de login fallido devuelven `"Invalid credentials"` — no revela si el username existe o si el PIN es incorrecto. |
| Inactive user | OK | Tanto staff como admin: `if (!user.isActive()) throw "Invalid credentials"`. No revela que el usuario está inactivo. |
| PIN/password hashing | OK | Argon2 vía `PasswordEncoder`. Nunca almacena en texto plano. |
| JWT generation | OK | `JwtService.generateAccessToken()` incluye `sub` (userId), `username`, `role`, `iat`, `exp`. |
| JWT validation | OK | `JwtAuthenticationFilter` parsea y verifica el token. Cualquier excepción → `SecurityContextHolder.clearContext()` y continúa sin autenticación. |
| JWT expiration | Parcial | 1h en prod, 24h en dev. Sin refresh tokens — sesión expira y requiere re-login. |
| JWT secret validation | OK | `JwtService` constructor: fail-fast si secret es nulo, vacío, < 32 bytes, o igual al valor de fallback conocido. |
| Rate limiting | **No encontrado** | Ningún mecanismo. Crítico para producción. |
| Logout | Parcial | Logout es client-side: mobile borra el token de SecureStore. No hay token blacklist ni invalidación server-side. Token sigue válido hasta expirar. |
| `GET /api/auth/me` | OK | Verifica que el user siga `active` en el momento del request. Token de usuario inactivado fallará en el siguiente `/me`. |

---

## 6. Revisión Específica de Configuración

| Item | Estado | Detalle |
|---|---|---|
| `application.properties` (base) | OK | Define defaults seguros: `ddl-auto=validate`, Flyway enabled, stacktrace never, error message never. |
| `application-dev.properties` | **Riesgo** | DB password en texto plano. JWT secret con fallback hardcoded (`local-dev-jwt-secret-must-be-at-least-32-bytes`). Este fallback es aceptable en dev, pero el archivo no debe estar en git. |
| `application-prod.properties` | OK | No tiene fallbacks para DB ni JWT. CORS tiene fallback vacío — ver riesgo abajo. |
| `application-test.properties` | OK | JWT secret de test hardcoded es correcto (tests necesitan un valor fijo). |
| `spring-boot-devtools` | **Riesgo potencial** | `spring-boot-devtools` está en `pom.xml` como `runtime/optional`. Spring Boot lo excluye automáticamente en fat JARs de producción, pero solo si se usa el build plugin correctamente. Verificar que no esté activo. |
| CORS con `allowedOrigins` vacío | **Riesgo** | `CorsConfig`: `if (!corsProperties.getAllowedOrigins().isEmpty())` — si la lista está vacía, no se setean origins, lo que por defecto en Spring puede bloquear todos los requests cross-origin. En producción si `CORS_ALLOWED_ORIGINS` no se configura, el CORS fallará silenciosamente. |
| JWT expiration prod | OK con nota | `${JWT_EXPIRATION_SECONDS:3600}` — fallback de 3600s (1h) si la variable no está. Aceptable, pero debe ser intencional. |
| Fail-fast en startup | OK para JWT | App no arranca sin JWT secret. Sin embargo, si `DATABASE_URL` no está configurado, Spring Boot fallará en el datasource con un error menos claro. |

---

## 7. Revisión Específica de DB y Migraciones

| Item | Estado | Detalle |
|---|---|---|
| PostgreSQL config | OK | Driver correcto, Flyway para PostgreSQL incluido. |
| Flyway habilitado | OK | `spring.flyway.enabled=true` en base properties. `ddl-auto=validate` significa Hibernate no modifica el esquema — solo Flyway lo hace. |
| Orden de migraciones | OK | V1 → V13, sin saltos, sin nombres duplicados. |
| Reproducibilidad desde cero | OK | Migraciones acumulan schema correctamente. No se detectaron migraciones que asuman datos previos. |
| Datos reales en migrations | OK | No existe ningún `INSERT INTO` en los scripts de migración. |
| Seeds / admin inicial | **Pendiente** | No existe ningún mecanismo para crear el primer usuario ADMIN. Para producción, necesitan un proceso de bootstrap. Opciones: migration separada, script SQL manual, endpoint de setup (con token único), o CLI. |
| Backup strategy | **No encontrado** | No hay scripts de backup, cron jobs, ni documentación de strategy. Crítico antes de producción. |
| Cloud DB readiness | **Pendiente** | `application-prod.properties` está listo para recibir `DATABASE_URL`. Pero no se ha decidido ni configurado el proveedor cloud (RDS, Supabase, Cloud SQL, etc.). |
| Connection pooling | Pendiente/default | Se usa HikariCP (default de Spring Boot). No hay configuración explícita de `maximum-pool-size`, `connection-timeout`, etc. Para producción con carga real, configurar el pool. |

---

## 8. Revisión Específica Mobile

| Item | Estado | Detalle |
|---|---|---|
| SecureStore | OK | `expo-secure-store` usado exclusivamente para el token. Correcto. |
| API client | OK | `axios` con interceptor de request (añade Bearer) y response (maneja 401). Timeout de 10s. |
| Manejo de 401 | OK | Interceptor limpia token + llama `notifyUnauthorized()` → `AuthContext` hace logout y redirige. Flujo correcto. |
| Variables EXPO_PUBLIC | OK | Solo `EXPO_PUBLIC_API_BASE_URL`. No hay secrets en `EXPO_PUBLIC_*`. `env.ts` valida la presencia en startup. |
| `app.json` | Parcial | Correcto para desarrollo. No tiene `extra` ni configuración EAS. `scheme` definido (`shiftcontrolmobile`). |
| EAS profiles | **No encontrado** | No existe `eas.json`. Sin EAS, no hay proceso de build para distribución interna ni producción. |
| Secrets privados en bundle | OK | Ninguno detectado. |
| API base URL por ambiente | **Pendiente** | Solo `.env.local` con IP local HTTP. Para distribución, se necesita `.env.production` con URL HTTPS. |
| HTTPS en producción | **Pendiente** | `.env.local` usa `http://10.103.237.125:8080`. Producción requiere `https://`. |
| Logs sensibles | OK | No se detectaron `console.log` en código de aplicación (`src/` ni `app/`). |
| No console.log en app code | OK | Búsquedas en `src/**` y `app/**` no encontraron `console.log`. |

---

## 9. Riesgos Críticos Antes de Deploy

| Prioridad | Riesgo | Impacto | Acción recomendada |
|---|---|---|---|
| **P0** | Sin rate limiting en endpoints de login | Fuerza bruta de PINs (6 dígitos = 1,000,000 combinaciones) y passwords. Ataque de credential stuffing. | Implementar rate limiting por IP en `/api/auth/*/login` antes de cualquier deploy público. |
| **P0** | Sin HTTPS / TLS | Tokens JWT, PINs, y passwords viajan en texto plano por la red. | Configurar TLS en el backend o en un proxy inverso (Nginx/Caddy). Actualizar URL mobile a HTTPS. |
| **P0** | Sin Dockerfile para el backend | No se puede desplegar el backend en ningún entorno cloud sin un Dockerfile. | Crear `Dockerfile` multistage para el backend (`build` con Maven, `run` con JRE slim). |
| **P0** | Sin mecanismo de bootstrap de admin inicial | En producción no hay forma de crear el primer ADMIN. La app es inoperable sin admin. | Definir e implementar un proceso de bootstrap controlado (script SQL + variable de entorno, o similar). |
| **P1** | `application-dev.properties` potencialmente en historial git | Credenciales de DB dev en el repositorio. Riesgo de exposición si el repo es accesible. | Verificar historial de git. Si fue commiteado, limpiar con `git filter-repo`. |
| **P1** | CORS con `allowedOrigins` vacío en prod | Si `CORS_ALLOWED_ORIGINS` no se configura, el comportamiento CORS es indefinido — puede bloquear la app mobile o habilitar origins inesperados. | Definir `CORS_ALLOWED_ORIGINS` explícitamente en el entorno de producción. Documentar como variable requerida. |
| **P1** | Sin logging estructurado | Eventos críticos (logins fallidos, closures, incidentes) no quedan en logs. Imposible auditar incidentes de seguridad post-facto. | Implementar logging básico con SLF4J/Logback en servicios críticos: auth, shifts, closures. |
| **P1** | Sin health/readiness endpoint | Sin `/health`, no se puede hacer deploy con health checks en Docker/Kubernetes/cloud, ni integrar con monitoreo básico. | Añadir `spring-boot-starter-actuator` o implementar un endpoint simple. |
| **P2** | Sin EAS / sin proceso de build mobile | No existe `eas.json`. Sin EAS Build, no hay forma de generar un `.apk`/`.ipa` para distribución interna. | Configurar EAS con perfil `preview` para distribución interna antes del primer pilot. |
| **P2** | `PATCH /api/incidents/{id}/resolve` no protegido a nivel URL | Depende solo del service-level check. Un bug en el service podría permitir que STAFF resuelva incidentes. | Añadir regla explícita en `SecurityConfig` o mover a `/api/admin/**`. |

---

## 10. Plan Recomendado de Implementación

### Fase 15.2 — Config/Env Hardening
**Objetivo:** Eliminar ambigüedades de configuración y documentar todas las variables requeridas.

**Archivos probables:** `backend/.env.example`, `shift-control-mobile/.env.example`, `application-prod.properties`, `SecurityConfig.java`

**Qué se implementaría:**
- Crear `backend/.env.example` con todas las variables requeridas y sus valores esperados (sin valores reales)
- Crear `shift-control-mobile/.env.example` con `EXPO_PUBLIC_API_BASE_URL=https://api.yourapp.com`
- Arreglar la lógica CORS para que la app falle al arrancar si `CORS_ALLOWED_ORIGINS` está vacío en producción
- Verificar y documentar el comportamiento de `spring-boot-devtools` en el fat JAR de prod

**Validación:** App arranca en prod solo si todas las variables críticas están configuradas. CORS falla early.

**Riesgo:** Bajo — solo configuración.

---

### Fase 15.3 — API Security Hardening
**Objetivo:** Implementar rate limiting y reforzar la autorización en endpoints sensibles.

**Archivos probables:** `SecurityConfig.java`, `pom.xml`, nuevo `RateLimitFilter.java` o similar

**Qué se implementaría:**
- Añadir Bucket4j o Spring's built-in rate limiting en endpoints de login
- Mover `PATCH /api/incidents/{id}/resolve` a doble protección (URL + service)
- Auditar y confirmar `validateIncidentAccess()` y `validateIncidentReadAccess()` en `IncidentService`

**Validación:** Test de login con >N requests por minuto retorna 429. STAFF no puede resolver incidentes.

**Riesgo:** Medio — cambios en SecurityConfig pueden romper tests existentes.

---

### Fase 15.4 — DB Cloud + Bootstrap
**Objetivo:** Preparar la base de datos para un entorno cloud y el proceso de creación del primer admin.

**Archivos probables:** Nueva migration `V14__`, script `bootstrap-admin.sql` o clase `DataInitializer.java` condicionada por property, `application-prod.properties`

**Qué se implementaría:**
- Definir proveedor cloud (RDS, Supabase, Cloud SQL, Railway, etc.)
- Script de bootstrap para crear el primer ADMIN (fuera de Flyway, ejecutado una sola vez)
- Configurar HikariCP connection pool para producción
- Documentar estrategia de backup

**Validación:** DB cloud provisioned, Flyway corre todas las migraciones desde cero, admin puede loguear.

**Riesgo:** Alto — decisión de infraestructura irreversible.

---

### Fase 15.5 — Logging, Health y Observabilidad
**Objetivo:** Hacer el sistema operable en producción con trazabilidad y health checks.

**Archivos probables:** `pom.xml`, `application.properties`, `application-prod.properties`, `AuthService.java`, `ShiftService.java`, `GlobalExceptionHandler.java`

**Qué se implementaría:**
- Añadir `spring-boot-starter-actuator` (configurado para exponer solo `/health` en producción)
- Añadir `@Slf4j` y logging de eventos críticos en `AuthService`, `ShiftService`, `ShiftClosureService`
- Configurar `logback-spring.xml` para producción (JSON structured logs si se usa un aggregator)

**Validación:** `GET /actuator/health` retorna 200 con DB status. Logs visibles con nivel correcto.

**Riesgo:** Bajo a medio.

---

### Fase 15.6 — Docker Backend + HTTPS
**Objetivo:** Containerizar el backend y configurar TLS.

**Archivos probables:** Nuevo `backend/Dockerfile`, nuevo `docker-compose.prod.yml`

**Qué se implementaría:**
- `Dockerfile` multistage: stage `build` con `maven:3.9-eclipse-temurin-21`, stage `run` con `eclipse-temurin:21-jre-alpine`
- Decidir estrategia TLS: Nginx reverse proxy (recomendado) o Caddy o certificado directo en Spring
- `docker-compose.prod.yml` con backend + PostgreSQL (o backend solo si DB es cloud)

**Validación:** `docker build` exitoso. App responde en HTTPS. Certificado válido.

**Riesgo:** Alto — decisión de infraestructura de deployment.

---

### Fase 15.7 — Mobile Preview/Internal Build
**Objetivo:** Generar una build de distribución interna para testing.

**Archivos probables:** Nuevo `shift-control-mobile/eas.json`, nuevo `shift-control-mobile/.env.production`, `app.json`

**Qué se implementaría:**
- Crear `eas.json` con profiles: `development`, `preview` (para distribución interna), `production`
- Crear `.env.production` con `EXPO_PUBLIC_API_BASE_URL=https://api.yourapp.com`
- Configurar `app.json` con `bundleIdentifier` (iOS) y `package` (Android) para producción
- Generar build con `eas build --profile preview`

**Validación:** APK/IPA instalable. App apunta a backend HTTPS. Login funciona.

**Riesgo:** Medio — requiere cuenta Expo EAS y decisión sobre bundle IDs.

---

### Fase 15.8 — QA y Security Checklist Final
**Objetivo:** Validación final antes de producción.

**Qué se implementaría:**
- `pnpm audit` y `./mvnw dependency-check:check` (OWASP Dependency Check plugin)
- Test de penetración básico: intentar acceder a recursos de otro staff, intentar fuerza bruta en login
- Revisar todos los DTOs de response para confirmar que `pinHash`/`passwordHash` no se exponen
- Smoke test completo del flujo staff + admin en staging
- Confirmar que `.env.local` y `application-dev.properties` NO están en git

**Validación:** Checklist completado. No hay CVEs críticos. Todos los tests pasan en staging.

**Riesgo:** Bajo — solo validación.

---

## 11. Comandos de Validación Detectados

| Operación | Comando real | Encontrado en |
|---|---|---|
| Tests backend | `./mvnw test` | `Jenkinsfile`, `backend/mvnw` |
| Build backend (JAR) | `./mvnw package` | Implícito en Spring Boot Maven plugin |
| Tests mobile | `pnpm test` | `package.json` → `"test": "jest"` |
| TypeScript check mobile | `pnpm exec tsc --noEmit` | `tsconfig.json` presente |
| Lint mobile | `pnpm lint` | `package.json` → `"lint": "expo lint"` |
| Start mobile dev | `pnpm start` | `package.json` → `"start": "expo start"` |
| Start Android | `pnpm android` | `package.json` |
| Migrations | Automático en startup de Spring Boot (Flyway) | `application.properties` → `spring.flyway.enabled=true` |
| Docker DB local | `docker compose up -d` | `docker-compose.yml` |
| Jenkins CI (start) | `cd jenkins-local && docker compose up -d` | `jenkins-local/docker-compose.yml` |
| Build Docker backend | **No encontrado** | No existe Dockerfile del backend |
| Build mobile producción | **No encontrado** | No existe `eas.json` |
| Dependency audit backend | **No encontrado** | OWASP Dependency Check no está en `pom.xml` |
| Dependency audit mobile | **No encontrado** | No hay script de `pnpm audit` en CI |

---

## Conclusión Ejecutiva

El proyecto Shift Control tiene una base técnica **sólida y bien diseñada**. El código de seguridad existente es correcto: Argon2 para hashing, JWT con fail-fast en startup, mensajes de error OWASP-compliant, propiedad verificada a nivel de service, stack traces deshabilitados. El equipo trabajó con buenas prácticas.

Los **gaps críticos son todos de infraestructura y operabilidad**, no de lógica de negocio:
1. No hay HTTPS configurado — el más urgente antes de cualquier deploy real.
2. No hay rate limiting en login — el más urgente en términos de seguridad.
3. No hay Dockerfile para el backend — bloqueante para deploy.
4. No hay mecanismo de bootstrap del primer admin — la app es inoperable en producción limpia.
5. No hay logging estructurado — la app no es auditable.

La aplicación está lista para avanzar hacia producción, pero requiere resolver los P0 antes de exponer cualquier endpoint a la red real.

---

## Bloque Recomendado para Implementar Primero

**Fase 15.2 + inicio de 15.3** en paralelo:
- `backend/.env.example` documentando todas las variables requeridas
- Fix del comportamiento CORS vacío (fail-fast si `CORS_ALLOWED_ORIGINS` está vacío en prod)
- Rate limiting en endpoints de login (Bucket4j es la opción más simple para Spring Boot)
- Verificación del historial git para `application-dev.properties`

Estos cuatro cambios tienen el mayor retorno de seguridad con el menor riesgo de breaking changes.

---

## Preguntas Abiertas / Decisiones Necesarias

1. **¿Dónde se despliega el backend?** (VPS propio, Railway, Render, AWS, Azure, etc.) — determina la estrategia de Dockerfile, TLS y DB cloud.
2. **¿Base de datos cloud o self-hosted?** (RDS, Supabase, Cloud SQL, PostgreSQL en VPS) — determina la migration de datos y backup strategy.
3. **¿Refresh tokens?** — La decisión de no tenerlos es válida para MVP, pero el usuario debe re-loginear cada hora en prod. ¿Es aceptable para los operadores?
4. **¿Bootstrap de admin inicial?** — ¿Script SQL manual ejecutado una sola vez, o se construye un endpoint de setup protegido por token único?
5. **¿Distribución mobile?** — ¿APK directo (sideload) para uso interno, o EAS Build + TestFlight/internal track?
6. **¿Monorepo con pnpm workspaces globales?** — Actualmente el workspace solo incluye el mobile. ¿Se integrará el backend Java en el mismo workspace de pnpm (poco común) o se manejará por separado?
7. **¿Staging environment?** — ¿Se crea un entorno staging antes de producción, o se va directo a producción con un pilot controlado?
8. **¿Monitoring?** — ¿Solo logs en consola, o se integra algo como Sentry, Grafana, o Datadog incluso para el MVP interno?

Backend hosting:
Render, usando Dockerfile. Staging primero. Plan pago básico cuando sea producción real.

DB:
Supabase PostgreSQL para staging, porque quieres aprenderlo y encaja con PostgreSQL/Flyway/Hibernate.

Refresh tokens:
No todavía. Para internal build, JWT de 12 horas. Refresh tokens quedan como mejora posterior.

Bootstrap admin:
CommandLineRunner condicionado por variables de entorno. No endpoint público. No Flyway con credenciales.

Mobile distribution:
EAS Build preview para Android/internal distribution. Luego iOS/TestFlight si aplica.

Monorepo:
No integrar Java en pnpm. Mantener Maven para backend y pnpm para mobile.

Staging:
Sí, obligatorio antes de producción.

Monitoring:
Primera fase: logs útiles + Actuator health/readiness. Luego Sentry.