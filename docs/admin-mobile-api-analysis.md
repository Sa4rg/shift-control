# ADMIN Mobile Flow — Backend API Analysis

**Shift Control — Phase 15**

---

## Concise Technical Summary

El backend expone una superficie ADMIN bien estructurada. Todas las rutas `/api/admin/**` están protegidas a nivel del security filter. Las rutas compartidas con STAFF (`/api/shifts`, `/api/sales`, `/api/incidents`, `/api/closures`) aplican control de acceso por rol dentro de la capa de servicio. Todos los campos de dinero usan `BigDecimal` (serializa como número JSON). Todos los timestamps usan `Instant` → string ISO-8601 UTC; los campos solo-fecha usan `LocalDate` → string `"YYYY-MM-DD"`. Los principales gaps de mobile readiness son la falta de filtros en el listado de incidentes, turnos y revisiones semanales — todos devuelven colecciones completas sin filtrar para ADMIN.

---

## 1. Auth

### POST /api/auth/admin/login

- **Role access:** público (sin token)
- **Request body:** `{ "username": "admin.user", "password": "securePassword123" }`
- **Response:** `AuthResponse`
  - `accessToken` (string)
  - `tokenType` — siempre `"Bearer"`
  - `expiresIn` (long, segundos)
  - `user` → `AuthenticatedUserResponse`:
    - `id` (UUID)
    - `username` (string)
    - `fullName` (string)
    - `role` — `"ADMIN"`
    - `storeId` — **siempre `null` para ADMIN**
- **Error:** `400 "Invalid credentials"` para username incorrecto, password incorrecta o cuenta inactiva — intencionalmente indistinguible
- **Archivos:** `AuthController.java`, `AuthService.java`, `AdminLoginRequest.java`, `AuthResponse.java`

### GET /api/auth/me

- **Role access:** cualquier usuario autenticado (ADMIN o STAFF)
- **Response:** mismo `AuthenticatedUserResponse` (`id`, `username`, `fullName`, `role`, `storeId`)
- `storeId` es `null` para ADMIN
- `401` si el token falta o expiró
- **Archivos:** `AuthController.java`, `AuthenticatedUserResponse.java`
- **Tests:** `AuthIntegrationTest.java`

---

## 2. Stores

Todos los endpoints de mutación de stores están protegidos a nivel del **security filter** (requieren rol `ADMIN`).

### GET /api/stores

- **Role access:** cualquier autenticado (STAFF y ADMIN)
- **Query params:** `?search=<string>` (filtro por nombre, opcional), `?includeInactive=false` (default false)
- **Response:** `List<StoreResponse>`

### GET /api/stores/{id}

- **Role access:** cualquier autenticado
- **Response:** `StoreResponse`

### POST /api/stores

- **Role access:** ADMIN only (security filter)
- **Request body:** `{ "name": "...", "address": "...", "baseCashAmount": 103.00 }`
  - Todos los campos `@NotBlank` / `@NotNull @Positive`
- **Response:** `StoreResponse` — `201 Created`

### PATCH /api/stores/{id}

- **Role access:** ADMIN only (security filter)
- **Request body:** `{ "name": "...", "address": "...", "baseCashAmount": 103.00 }` (todos requeridos)
- **Response:** `StoreResponse`

### PATCH /api/stores/{id}/deactivate

- **Role access:** ADMIN only (security filter: `PATCH /api/stores/**`)
- **Sin body**
- **Response:** `StoreResponse` con `active: false`, `deactivatedById`, `deactivatedByName`, `deactivatedAt`

**Campos de `StoreResponse`:**
`id`, `name`, `address`, `baseCashAmount` (BigDecimal), `active`, `deactivatedById`, `deactivatedByName`, `deactivatedAt` (Instant ISO string)

**Tests:** `StoreIntegrationTest.java`, `StoreAuditIntegrationTest.java`, `AuthorizationIntegrationTest.java`

---

## 3. Users

Todos los endpoints de usuarios están bajo `/api/admin/users` — **ADMIN only a nivel del security filter**.

### GET /api/admin/users

- **Query params:** `?role=STAFF|ADMIN` (opcional), `?includeInactive=false` (default false)
- **Response:** `List<UserResponse>`

### GET /api/admin/users/{id}

- **Response:** `UserResponse`

### POST /api/admin/users/staff

- **Request body:**
  ```json
  { "fullName": "...", "username": "...", "pin": "123456", "storeId": "<UUID>" }
  ```
  - `pin` debe ser exactamente 6 dígitos (`@Pattern(regexp = "\\d{6}")`)
  - `storeId` requerido
- **Response:** `UserResponse` — `201 Created`
- El PIN se hashea antes de persistir, **nunca se devuelve** en la respuesta

### POST /api/admin/users/admin

- **Request body:**
  ```json
  { "fullName": "...", "username": "...", "email": "...", "password": "..." }
  ```
  - `password` mínimo 8 caracteres, máximo 120
- **Response:** `UserResponse` — `201 Created`
- ADMIN puede crear tanto cuentas STAFF como ADMIN

### PATCH /api/admin/users/{id}/deactivate

- **Sin body**
- **Response:** `UserResponse` con `active: false`, `deactivatedById`, `deactivatedByName`, `deactivatedAt`

**Campos de `UserResponse`:**
`id`, `fullName`, `username`, `email`, `role`, `storeId` (null para ADMIN), `active`, `deactivatedById`, `deactivatedByName`, `deactivatedAt`

**Gap:** No existe endpoint de actualización. No se puede cambiar `fullName`, `email`, `storeId` ni resetear PIN/password por API.

**Tests:** `UserManagementIntegrationTest.java`, `UserAuditIntegrationTest.java`

---

## 4. Shifts and Closures

### GET /api/shifts

- **Role access:** cualquier autenticado
- **Comportamiento ADMIN:** devuelve **todos los turnos** del sistema (sin filtros — sin params `staffId`, `storeId`, `status`, rango de fechas)
- **Comportamiento STAFF:** devuelve solo sus propios turnos
- **Response:** `List<ShiftResponse>`

### GET /api/shifts/{id}

- **Role access:** ADMIN (cualquiera), STAFF (solo el propio — 400 si es de otro)
- **Response:** `ShiftResponse`

### GET /api/shifts/current

- **Role access:** STAFF only — el servicio lanza `400 "Only staff users can have current shifts"` para ADMIN
- ADMIN **no debe** llamar a este endpoint

### POST /api/shifts/{id}/close

- **Role access:** dueño del turno o ADMIN
- **Request body:** `{ "confirmedCashAmount": 273.00, "confirmedMbAmount": 80.00, "note": "..." }` (note opcional)
- **Response:** `ShiftClosureResponse`

### GET /api/shifts/{id}/close-preview

- **Role access:** ADMIN (cualquiera), STAFF (solo el propio)
- **Response:** `ShiftClosePreviewResponse` (totales, `cashToWithdraw`, `expectedPhysicalCash`)

**Campos de `ShiftResponse`:**
`id`, `staffId`, `staffName`, `storeId`, `storeName`, `type` (`DAY|NIGHT`), `status` (`OPEN|CLOSED`), `openedAt` (Instant), `closedAt` (Instant), `closedById`

### GET /api/closures/{id}

- **Role access:** ADMIN (cualquiera), STAFF (solo el cierre de su propio turno — 400 en otro caso)
- **Response:** `ShiftClosureResponse`

### GET /api/closures?shiftId={UUID}

- **Role access:** ADMIN (cualquiera), STAFF (solo su propio turno)
- `shiftId` es **requerido** — `400 "shiftId is required"` si falta
- No existe endpoint para listar todos los cierres — solo búsqueda por `closureId` o `shiftId`
- **Response:** `ShiftClosureResponse` (un único objeto)

**Campos de `ShiftClosureResponse`:**
`id`, `shiftId`, `closedById`, `totalCash`, `totalMb`, `totalGlovoOnline`, `totalGlovoCash`, `totalSales`, `pendingInvoiceTotal`, `cashToWithdraw`, `expectedPhysicalCash`, `confirmedCashAmount`, `confirmedMbAmount`, `cashDifference`, `mbDifference`, `status` (`CLOSED_OK|CLOSED_WITH_INCIDENT`), `note`, `createdAt`, `updatedAt`

**Nota:** el cierre no incluye `staffId` ni `staffName` directamente — se debe cruzar con `shiftId`.

**Tests:** `ShiftFlowIntegrationTest.java`, `ShiftClosureFlowIntegrationTest.java`, `ShiftClosureReadIntegrationTest.java`

---

## 5. Sales

### GET /api/sales?shiftId={UUID}

- **Role access:** ADMIN (cualquier turno), STAFF (solo turno propio)
- `shiftId` es **requerido** — `400 "shiftId is required"` si falta
- `shiftId=current` — solo STAFF; ADMIN recibe error de servicio
- Sin filtros adicionales por fecha, store o staff
- **Response:** `List<SaleResponse>` ordenado por `createdAt desc`

### GET /api/sales/{id}

- **Role access:** ADMIN (cualquiera), STAFF (solo el propio — 400 en otro caso)
- **Response:** `SaleResponse`

### PATCH /api/sales/{id}/invoice

- **Role access:** ADMIN o STAFF (propio). Aplicado en servicio.
- **Sin body**
- **Response:** `SaleResponse` actualizado

### PATCH /api/sales/{id}/cancel

- **Role access:** ADMIN o STAFF (propio). Aplicado en servicio.
- **Request body:** `{ "reason": "..." }` (requerido)
- ADMIN puede cancelar ventas solo en **turnos abiertos** — `400 "Closed shift sale cannot be cancelled"` aplica a ambos roles
- **Response:** `SaleResponse` actualizado

### POST /api/sales

- **STAFF only** — el servicio lanza `400 "Only staff users can create sales"` para ADMIN

**Campos de `SaleResponse`:**
`id`, `shiftId`, `staffId`, `staffName`, `storeId`, `storeName`, `status` (`ACTIVE|CANCELLED`), `invoiceStatus` (`PENDING|INVOICED`), `subtotalAmount`, `discountTotalAmount`, `finalTotalAmount`, `note`, `cancelledReason`, `createdAt`, `updatedAt`, `cancelledAt`, `cancelledById`, `cancelledByName`, `items[]`, `discounts[]`, `payments[]`

Todos los campos de dinero son `BigDecimal` → número JSON.

**Tests:** `SaleFlowIntegrationTest.java`, `SaleAuditIntegrationTest.java`

---

## 6. Incidents

Bajo `/api/incidents` — `authenticated` en security config. Enforcement de rol en el servicio.

### POST /api/incidents

- **Role access:** STAFF o ADMIN
- **ADMIN:** puede crear incidente para cualquier `shiftId`, `closureId` o `saleId` sin restricción de ownership
- **Request body:**
  ```json
  {
    "type": "CASH_DIFFERENCE",
    "severity": "MEDIUM",
    "title": "...",
    "description": "...",
    "shiftId": "...",    // opcional
    "closureId": "...",  // opcional
    "saleId": "..."      // opcional
  }
  ```
  Al menos uno de `shiftId`, `closureId`, `saleId` debe estar presente
- **Valores de `IncidentType`:** `CASH_DIFFERENCE`, `MB_DIFFERENCE`, `GLOVO_ISSUE`, `WRONG_CHARGE`, `PENDING_INVOICE`, `SALE_CANCELLATION`, `OPERATIONAL_NOTE`, `OTHER`
  - **Nota:** el mobile-api-contract documenta `GLOVO_DIFFERENCE` pero el enum real es `GLOVO_ISSUE`
- **Valores de `IncidentSeverity`:** `LOW`, `MEDIUM`, `HIGH`
- **Response:** `IncidentResponse` — `201 Created`

### GET /api/incidents

- **Role access:** cualquier autenticado
- **ADMIN:** devuelve todos los incidentes ordenados por `createdAt desc`
- **STAFF:** devuelve solo los incidentes donde el usuario autenticado es `reportedBy` o el turno/cierre/venta relacionado le pertenece
- **Query params:** `?status=OPEN|RESOLVED` (opcional). **Sin filtro por `shiftId`, `closureId`, `saleId`, `staffId` o `storeId`**
- **Response:** `List<IncidentResponse>`

### GET /api/incidents/{id}

- **Role access:** ADMIN (cualquiera), STAFF (solo si está relacionado con su propio contexto)
- **Response:** `IncidentResponse`

### PATCH /api/incidents/{id}/resolve

- **ADMIN only** — el servicio aplica: `400 "Only admin users can resolve incidents"` para STAFF
- **Request body:** `{ "resolutionNote": "..." }` (requerido, max 1000 chars)
- **Response:** `IncidentResponse` actualizado con `status: "RESOLVED"`, `resolvedById`, `resolvedByName`, `resolvedAt`

**Campos de `IncidentResponse`:**
`id`, `shiftId`, `closureId`, `saleId`, `reportedById`, `reportedByName`, `resolvedById`, `resolvedByName`, `type`, `status` (`OPEN|RESOLVED`), `severity`, `title`, `description`, `resolutionNote`, `createdAt`, `updatedAt`, `resolvedAt`

**Tests:** `IncidentFlowIntegrationTest.java`

---

## 7. Reports

Todos los endpoints de reportes bajo `/api/admin/reports` — **ADMIN only a nivel del security filter**.

### GET /api/admin/reports/daily

- **Query params:** `storeId` (UUID, requerido), `date` (ISO date string `YYYY-MM-DD`, requerido)
- **Response:** `DailyReportResponse`
  - `storeId`, `storeName`, `date` (LocalDate)
  - `totalCash`, `totalMb`, `totalGlovoOnline`, `totalGlovoCash`, `totalSales`, `pendingInvoiceTotal` (BigDecimal)
  - `cashDifferenceTotal`, `mbDifferenceTotal` (BigDecimal)
  - `closuresCount`, `closedOkCount`, `closedWithIncidentCount` (int)
  - `activeSalesCount`, `cancelledSalesCount` (int)
  - `openIncidentsCount`, `resolvedIncidentsCount` (int)
  - `staffSummaries: List<DailyStaffSummaryResponse>` — mismos campos por staff

### GET /api/admin/reports/weekly

- **Query params:** `storeId` (UUID, requerido), `weekStart` (ISO date `YYYY-MM-DD`, requerido)
- **Response:** `WeeklyReportResponse`
  - `storeId`, `weekStart`, `weekEnd` (LocalDate)
  - **Nota:** sin `storeName` a nivel raíz — solo dentro de cada `staffSummary`
  - `staffSummaries: List<WeeklyStaffSummaryResponse>`
    - `storeId`, `storeName`, `staffId`, `staffName`
    - `totalCash`, `totalMb`, `totalGlovoOnline`, `totalGlovoCash`, `totalSales`, `pendingInvoiceTotal`
    - `cashDifferenceTotal`, `mbDifferenceTotal`
    - `closuresCount`, `incidentCount`

### GET /api/admin/reports/monthly

- **Query params:** `storeId` (UUID, requerido), `month` (string `"YYYY-MM"`, requerido — no es ISO date)
- **Response:** `MonthlyReportResponse`
  - Todos los campos del reporte diario más: `weeklyReviewsCount`, `weeklyReviewsOkCount`, `weeklyReviewsWithIncidentCount`
  - `monthStart`, `monthEnd` (LocalDate)
  - `staffSummaries: List<MonthlyStaffSummaryResponse>`
  - `weekSummaries: List<MonthlyWeekSummaryResponse>`

**Tests:** `DailyReportIntegrationTest.java`, `WeeklyReportIntegrationTest.java`, `MonthlyReportIntegrationTest.java`

---

## 8. Weekly Reviews

Todos los endpoints bajo `/api/admin/weekly-reviews` — **ADMIN only a nivel del security filter**.

### POST /api/admin/weekly-reviews

- **Request body:**
  ```json
  {
    "storeId": "<UUID>",
    "staffId": "<UUID>",
    "weekStart": "2026-05-11",
    "status": "REVIEWED_OK",
    "note": "..."
  }
  ```
  - `weekEnd` es **calculado en el servidor** como `weekStart + 6 días`
  - `status` valores: `REVIEWED_OK | REVIEWED_WITH_INCIDENT`
  - `note` opcional (max 1000 chars)
  - `staffId` debe ser un usuario STAFF perteneciente al `storeId`
- **Protección de duplicados:** `400 "Weekly review already exists for staff and week"` si ya existe la misma combinación `store + staff + weekStart`
- **Comportamiento snapshot:** los totales se leen de `WeeklyReportService` en el momento de creación. Si no existen cierres para ese staff en esa semana, lanza `400 "No weekly closure summary found for staff"`
- **Response:** `WeeklyAdminReviewResponse` — `201 Created`
- **Nota:** el mobile-api-contract documenta incorrectamente `weekStartDate` y `weekEndDate` como campos de la request; el campo real del DTO es `weekStart`, y `weekEnd` no es un campo de request

### GET /api/admin/weekly-reviews

- **Sin query params** — devuelve **todas las revisiones** (sin filtro por `storeId`, `staffId`, `weekStart`)
- **Response:** `List<WeeklyAdminReviewResponse>`

### GET /api/admin/weekly-reviews/{id}

- **Response:** `WeeklyAdminReviewResponse`

**No existe endpoint de actualización.** Las revisiones son inmutables una vez creadas.

**Campos de `WeeklyAdminReviewResponse`:**
`id`, `storeId`, `storeName`, `staffId`, `staffName`, `reviewedById`, `reviewedByName`, `weekStart`, `weekEnd` (LocalDate), `totalCash`, `totalMb`, `totalGlovoOnline`, `totalGlovoCash`, `totalSales`, `pendingInvoiceTotal`, `cashDifferenceTotal`, `mbDifferenceTotal`, `closuresCount`, `incidentCount`, `status`, `note`, `createdAt`, `updatedAt`

**Tests:** `WeeklyAdminReviewIntegrationTest.java`

---

## 9. Security

### Reglas del security filter (`SecurityConfig.java`)

| Regla | Alcance |
|---|---|
| `POST /api/auth/staff/login` | `permitAll` |
| `POST /api/auth/admin/login` | `permitAll` |
| `GET /api/auth/me` | `authenticated` |
| `POST /api/stores` | `ADMIN` |
| `PATCH /api/stores/**` | `ADMIN` |
| `/api/admin/**` | `ADMIN` |
| `/api/**` | `authenticated` |

### Enforcement ADMIN-only a nivel de servicio (no security filter)

| Endpoint | Enforcement | Respuesta a STAFF |
|---|---|---|
| `PATCH /api/incidents/{id}/resolve` | Servicio: `400 "Only admin users can resolve incidents"` | 400 (no 403) |
| `POST /api/sales` | Servicio: `400 "Only staff users can create sales"` | No es caso de uso ADMIN |
| `POST /api/shifts/open` | Servicio: `400 "Only staff users can open shifts"` | No es caso de uso ADMIN |
| `GET /api/shifts/current` | Servicio: `400 "Only staff users can have current shifts"` | No es caso de uso ADMIN |

### Tests de seguridad

- `GET /api/**` sin token → `401 {"success":false,"message":"Unauthorized"}`
- JWT inválido → `401`
- STAFF en `/api/admin/**` → `403 {"success":false,"message":"Forbidden"}`
- STAFF en `POST /api/stores` → `403`
- STAFF en `PATCH /api/stores/{id}` → `403`
- ADMIN en cualquier endpoint autenticado → funciona correctamente

**Tests:** `SecurityIntegrationTest.java`, `AuthorizationIntegrationTest.java`

---

## 10. Recommended ADMIN Mobile Roadmap

### Listo para mobile ahora

| Feature | Endpoint |
|---|---|
| ADMIN login | `POST /api/auth/admin/login` |
| Restaurar sesión | `GET /api/auth/me` |
| Listar / obtener stores | `GET /api/stores`, `GET /api/stores/{id}` |
| Crear store | `POST /api/stores` |
| Actualizar store | `PATCH /api/stores/{id}` |
| Desactivar store | `PATCH /api/stores/{id}/deactivate` |
| Listar / obtener usuarios | `GET /api/admin/users`, `GET /api/admin/users/{id}` |
| Crear STAFF | `POST /api/admin/users/staff` |
| Crear ADMIN | `POST /api/admin/users/admin` |
| Desactivar usuario | `PATCH /api/admin/users/{id}/deactivate` |
| Listar todos los turnos | `GET /api/shifts` |
| Obtener cualquier turno | `GET /api/shifts/{id}` |
| Listar ventas por turno | `GET /api/sales?shiftId=<UUID>` |
| Obtener cualquier venta | `GET /api/sales/{id}` |
| Facturar / cancelar venta | `PATCH /api/sales/{id}/invoice`, `PATCH /api/sales/{id}/cancel` |
| Obtener cierre por ID o shiftId | `GET /api/closures/{id}`, `GET /api/closures?shiftId=<UUID>` |
| Listar incidentes | `GET /api/incidents` |
| Obtener incidente | `GET /api/incidents/{id}` |
| Crear incidente | `POST /api/incidents` |
| Resolver incidente | `PATCH /api/incidents/{id}/resolve` |
| Reporte diario | `GET /api/admin/reports/daily` |
| Reporte semanal | `GET /api/admin/reports/weekly` |
| Reporte mensual | `GET /api/admin/reports/monthly` |
| Crear revisión semanal | `POST /api/admin/weekly-reviews` |
| Listar / obtener revisiones | `GET /api/admin/weekly-reviews`, `GET /api/admin/weekly-reviews/{id}` |

### Gaps a resolver antes o durante el build del ADMIN mobile

1. **`GET /api/incidents` no tiene filtros contextuales.** En producción, un admin listando todos los incidentes de todos los stores recibirá una lista muy grande sin filtrar. Recomendado: añadir `?staffId=`, `?storeId=`, `?shiftId=`, `?closureId=`, `?saleId=` como query params.

2. **`GET /api/shifts` no tiene filtros.** ADMIN recibe todos los turnos en una sola llamada — sin filtro por `storeId`, `staffId`, `status` ni rango de fechas. Recomendado: añadir como mínimo `?storeId=` y `?status=`.

3. **`GET /api/admin/weekly-reviews` no tiene filtros.** Devuelve todas las revisiones globalmente. Recomendado: añadir `?storeId=`, `?staffId=`, `?weekStart=`.

4. **No existe endpoint de actualización para usuarios.** No se puede cambiar `fullName`, `email`, asignación de store, ni resetear PIN/password por API.

5. **No existe endpoint de actualización para revisiones semanales.** Una vez creada, el status y la nota no se pueden corregir sin una operación directa en BD.

6. **`ShiftClosureResponse` no incluye `staffId`/`staffName`.** El cierre solo expone `closedById`, no los datos del staff del turno. Las pantallas de cierre del ADMIN deben cruzar con el turno para mostrar la identidad del staff.

7. **`WeeklyReportResponse` no tiene `storeName` a nivel raíz.** Está presente dentro de cada `staffSummary`, no en el objeto raíz — inconsistencia menor para renderizado.

8. **`mobile-api-contract.md` tiene dos discrepancias vs la implementación real:**
   - Sección 6 lista el valor `GLOVO_DIFFERENCE` para `IncidentType`; el enum real es `GLOVO_ISSUE`
   - Sección 6 lista `weekStartDate` y `weekEndDate` como campos de la request de revisión; el campo real del DTO es `weekStart` únicamente (`weekEnd` se calcula en el servidor)

9. **Los campos de dinero serializan como números JSON** (`BigDecimal` → ej. `103.00` o `103.0`). Si el layer mobile parsea como números JavaScript no hay riesgo de precisión para importes a 2 decimales, pero la serialización exacta (si Jackson emite `103.0` vs `103.00`) debería verificarse contra la configuración Jackson del proyecto.

10. **Sin paginación en ningún endpoint.** Todos los endpoints de lista devuelven colecciones completas. Para el MVP es aceptable; en producción a escala, `GET /api/shifts` y `GET /api/incidents` serán los primeros en requerirla.
