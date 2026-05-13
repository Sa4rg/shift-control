# Phase 13 Test Coverage Audit Report

> **Instrucciones de lectura:** Este reporte fue generado inspeccionando el proyecto sin modificar ningún archivo de producción ni de tests. Su propósito es dar visibilidad completa al estado actual de la cobertura de tests y servir de base para planificar Phase 13.

---

## Executive Summary

El proyecto cuenta con **205 tests pasando** (BUILD SUCCESS) distribuidos en **26 archivos de test**. La cobertura de lógica de negocio a nivel de servicio es sólida: los módulos críticos (`auth`, `stores`, `users`, `shifts`, `sales`, `incidents`, `reviews`, `reports`) tienen tests unitarios con Mockito bien escritos. Sin embargo, existe una brecha significativa en tests de integración HTTP: **la mayoría de los endpoints carecen de tests end-to-end via MockMvc**. Los tests de integración existentes están concentrados en flujos de reporte, cierre de turno, incidentes y weekly reviews. Además, no existe configuración de CI (GitHub Actions) y hay duplicación de código considerable entre los test de integración.

**Resumen ejecutivo de números:**

| Categoría | Cantidad |
|---|---|
| Archivos de test totales | 26 |
| Tests unitarios (service layer) | ~13 archivos / ~155 tests estimados |
| Tests de integración (Testcontainers) | ~13 archivos / ~50 tests |
| Total tests (BUILD SUCCESS) | 205 |
| Endpoints HTTP con test de integración completo | ~9 de ~30 endpoints |
| Endpoints sin ningún test HTTP | ~21 de ~30 endpoints |
| CI configurado | ❌ No |

---

## Current Test Inventory

### Tests Unitarios (Service Layer)

| Archivo | Tests aprox. | Módulo |
|---|---|---|
| `auth/service/AuthServiceTest.java` | 13 | auth |
| `stores/service/StoreServiceTest.java` | 15 | stores |
| `users/service/UserServiceTest.java` | 17 | users |
| `shifts/service/ShiftServiceTest.java` | 23 | shifts |
| `closures/service/ShiftClosureServiceTest.java` | 8 | closures |
| `sales/service/SaleServiceTest.java` | 32 | sales |
| `incidents/service/IncidentServiceTest.java` | 15 | incidents |
| `reviews/service/WeeklyAdminReviewServiceTest.java` | 13 | reviews |
| `reviews/service/WeeklyReportServiceTest.java` | 5 | reviews |
| `reports/service/DailyReportServiceTest.java` | 4 | reports |
| `reports/service/MonthlyReportServiceTest.java` | 4 | reports |
| `shared/security/JwtServiceTest.java` | 5 | shared/security |
| `BackendApplicationTests.java` | 1 | shared |
| **TOTAL** | **~155** | |

### Tests de Integración (Testcontainers + MockMvc)

| Archivo | Tests | Flujo cubierto |
|---|---|---|
| `integration/ApplicationIntegrationTest.java` | 1 | Context loads |
| `integration/SecurityIntegrationTest.java` | 12 | Token ausente/inválido, roles, usuario inactivo |
| `integration/AuthorizationIntegrationTest.java` | 4 | STAFF no puede crear tienda/acceder a otro sale/turno |
| `integration/ShiftClosureFlowIntegrationTest.java` | 3 | Cerrar turno OK, cerrar con incidente, bloquear venta tras cierre |
| `integration/IncidentFlowIntegrationTest.java` | 6 | Crear incidente, listar, resolver, ownership |
| `integration/WeeklyAdminReviewIntegrationTest.java` | 8 | Crear/listar/obtener review, errores de validación |
| `integration/DailyReportIntegrationTest.java` | 4 | Reporte diario completo, STAFF→403, no encontrado, fechas |
| `integration/MonthlyReportIntegrationTest.java` | 4 | Reporte mensual completo, STAFF→403, no encontrado, fechas |
| `integration/WeeklyReportIntegrationTest.java` | 3 | Reporte semanal, STAFF→403, no encontrado |
| `integration/SaleAuditIntegrationTest.java` | 1 | `cancelledBy`/`cancelledAt`/`cancelledReason` en respuesta HTTP |
| `integration/StoreAuditIntegrationTest.java` | 2 | `deactivatedBy`/`deactivatedAt` en respuesta HTTP, STAFF→403 |
| `integration/UserAuditIntegrationTest.java` | 2 | `deactivatedBy`/`deactivatedAt`, no `passwordHash`/`pinHash`, STAFF→403 |
| **TOTAL** | **~50** | |

---

## Strong Coverage Areas

1. **Autenticación (AuthService):** Login de STAFF y ADMIN completamente cubiertos incluyendo usuario no encontrado, PIN/password incorrecto, usuario inactivo, y el mensaje de error genérico (OWASP). `getCurrentUser` cubierto.

2. **Cálculo de totales en cierre de turno (ShiftService.closeShift):** Tests que verifican `totalCash`, `totalMb`, `totalGlovoCash`, `totalGlovoOnline`, `cashToWithdraw`, `expectedPhysicalCash`, `cashDifference`, `mbDifference`, `CLOSED_OK` vs `CLOSED_WITH_INCIDENT`, ignorar ventas canceladas, cierre por admin. Es la lógica financiera más crítica y está bien cubierta.

3. **Lógica de descuentos en ventas (SaleService.createSale):** `LOYALTY_CARD` (fijo 20€, subtotal mínimo 25€), `VOUCHER_10_PERCENT`, `MANUAL_DISCOUNT` rechazado, `reason` null rechazado. Coincidencia pago/total verificada.

4. **Autorización de recursos (ownership):** `SaleService`, `ShiftService`, `IncidentService` y `ShiftClosureService` tienen tests que verifican que STAFF solo puede acceder a sus propios recursos.

5. **JWT (JwtServiceTest):** Generación y parseo correctos, rechazo de secret vacío, secret corto, secret con valor de fallback hardcodeado, expiración no positiva.

6. **Seguridad HTTP (SecurityIntegrationTest):** Sin token → 401, token inválido → 401, STAFF en endpoint de admin → 403, ADMIN en endpoint de admin → 200, usuario inactivo.

7. **Reportes (Daily/Monthly/Weekly):** Totales agregados correctos, agrupación por staff, filtros de fecha (boundary), STAFF → 403, storeId no encontrado → 404.

8. **WeeklyAdminReview:** 13 casos en unitario + 8 en integración. Validaciones de duplicado, sin cierres, ownership, STAFF → 403.

9. **Campos de auditoría (deactivatedBy, cancelledBy):** Los tres audit integration tests verifican que los campos aparecen correctamente en la respuesta HTTP y se persisten en base de datos.

---

## Coverage Gaps by Priority

### 🔴 CRITICAL

---

**GAP-C01: No hay tests HTTP para `POST /api/shifts/open`**

- **Módulo:** shifts
- **Por qué importa:** Abrir un turno es la operación de inicio del flujo principal. Sin un test HTTP, los errores de deserialización, validación de `@Valid`, mapeo de respuesta 201 y el header `Location` no están verificados end-to-end.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `ShiftIntegrationTest.should_open_shift_successfully_returns_201`
- **Archivos:** `ShiftController.java`, `ShiftService.java`, `OpenShiftRequest.java`

---

**GAP-C02: No hay tests HTTP para `POST /api/sales`**

- **Módulo:** sales
- **Por qué importa:** Registrar una venta es la operación más frecuente del sistema. El controller serializa `CreateSaleRequest` con múltiples listas (`items`, `discounts`, `payments`); errores de mapeo JSON no serían detectados por los tests unitarios del servicio.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `SaleIntegrationTest.should_create_sale_returns_201`
- **Archivos:** `SaleController.java`, `SaleService.java`, `CreateSaleRequest.java`

---

**GAP-C03: No hay tests HTTP para `GET /api/sales/{id}` ni `GET /api/sales?shiftId=current`**

- **Módulo:** sales
- **Por qué importa:** Los endpoints de lectura de ventas son usados constantemente por el staff. La lógica de `shiftId=current` tiene un branch especial en el controller que no está cubierto vía HTTP.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `SaleIntegrationTest.should_list_current_shift_sales`, `SaleIntegrationTest.should_get_sale_by_id`
- **Archivos:** `SaleController.java`

---

**GAP-C04: No hay tests HTTP para `PATCH /api/sales/{id}/cancel` (flujo completo)**

- **Módulo:** sales
- **Por qué importa:** `SaleAuditIntegrationTest` verifica solo los campos de auditoría. No existe test que verifique los casos de error: sale no encontrada (404), sale de otro staff (400), sale ya cancelada (400). El flujo de rechazo no está cubierto vía HTTP.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `SaleIntegrationTest.should_throw_400_when_cancelling_other_staff_sale`
- **Archivos:** `SaleController.java`, `SaleService.cancelSale()`

---

**GAP-C05: No hay tests HTTP para `PATCH /api/sales/{id}/invoice`**

- **Módulo:** sales
- **Por qué importa:** Marcar una venta como facturada es una operación administrativa frecuente. No existe ningún test HTTP para este endpoint.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `SaleIntegrationTest.should_mark_sale_as_invoiced_returns_200`
- **Archivos:** `SaleController.java`, `SaleService.markAsInvoiced()`

---

**GAP-C06: No hay tests HTTP para `GET /api/closures/{id}` ni `GET /api/closures?shiftId=`**

- **Módulo:** closures
- **Por qué importa:** `ShiftClosureFlowIntegrationTest` crea cierres de turno pero no llama a los endpoints de lectura de cierres. No existe ningún test que verifique la respuesta serializada de `ShiftClosureResponse` vía HTTP.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `ShiftClosureIntegrationTest.should_get_closure_by_id`, `ShiftClosureIntegrationTest.should_get_closure_by_shift_id`
- **Archivos:** `ShiftClosureController.java`

---

### 🟠 HIGH

---

**GAP-H01: No hay tests HTTP para `GET /api/shifts`, `GET /api/shifts/{id}`, `GET /api/shifts/current`**

- **Módulo:** shifts
- **Por qué importa:** Tres endpoints de lectura sin cobertura HTTP. El endpoint `GET /api/shifts/current` probablemente tiene lógica de controller específica (diferente de `GET /api/shifts/{id}`).
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `ShiftIntegrationTest.should_return_current_open_shift`, `ShiftIntegrationTest.should_list_shifts_for_staff`

---

**GAP-H02: No hay tests HTTP para `POST /api/auth/staff/login` ni `POST /api/auth/admin/login`**

- **Módulo:** auth
- **Por qué importa:** El login es el punto de entrada de todo el sistema. `SecurityIntegrationTest` llama a `/api/auth/staff/login` y `/api/auth/admin/login` implícitamente para obtener tokens en helpers, pero no hay tests dedicados que verifiquen la respuesta (estructura del token, `success: true`, mensaje, campos de `data`). Tampoco se verifica que el error sea genérico cuando el usuario no existe vs cuando el PIN es incorrecto.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `AuthIntegrationTest.should_return_access_token_on_staff_login`, `AuthIntegrationTest.should_return_generic_error_on_invalid_credentials`

---

**GAP-H03: No hay tests HTTP para `GET /api/auth/me`**

- **Módulo:** auth
- **Por qué importa:** El endpoint `GET /api/auth/me` no tiene ningún test HTTP. No se verifica la respuesta serializada (campos del usuario autenticado, ausencia de `passwordHash`/`pinHash`).
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `AuthIntegrationTest.should_return_authenticated_user_info`

---

**GAP-H04: No hay tests HTTP para `GET /api/stores`, `GET /api/stores/{id}`, `PATCH /api/stores/{id}`**

- **Módulo:** stores
- **Por qué importa:** Solo `POST /api/stores` y `PATCH /api/stores/{id}/deactivate` tienen tests HTTP. Los tres endpoints de lectura y actualización no están cubiertos.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `StoreIntegrationTest.should_list_stores`, `StoreIntegrationTest.should_update_store`

---

**GAP-H05: No hay tests HTTP para `GET /api/admin/users`, `GET /api/admin/users/{id}`, `POST /api/admin/users/staff`, `POST /api/admin/users/admin`**

- **Módulo:** users
- **Por qué importa:** `UserAuditIntegrationTest` solo cubre `PATCH /api/admin/users/{id}/deactivate`. La creación de usuarios y la lectura no tienen tests HTTP.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `UserIntegrationTest.should_create_staff_user_returns_201`, `UserIntegrationTest.should_list_users_for_admin`

---

**GAP-H06: No hay tests HTTP para `GET /api/incidents/{id}`**

- **Módulo:** incidents
- **Por qué importa:** `IncidentFlowIntegrationTest` cubre crear, listar y resolver incidentes, pero no llama a `GET /api/incidents/{id}`.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `IncidentFlowIntegrationTest.should_get_incident_by_id`

---

**GAP-H07: No existen tests de validación `@Valid` en `CreateSaleRequest` para inputs inválidos**

- **Módulo:** sales
- **Por qué importa:** `CreateSaleRequest` tiene listas de ítems, pagos y descuentos con anotaciones `@Valid`. No hay test que verifique que una petición con `items` vacío, `unitPrice` negativo, o `paymentAmount` null retorne 400. Si la validación estuviera ausente o mal configurada, pasaría desapercibido.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `SaleIntegrationTest.should_return_400_when_items_list_is_empty`

---

### 🟡 MEDIUM

---

**GAP-M01: No hay test que verifique que una venta no puede cancelarse después del cierre del turno**

- **Módulo:** sales
- **Por qué importa:** Regla de negocio `BR-SALE-006` (ventas solo editables con turno abierto). El test unitario `SaleServiceTest` cubre STAFF propietario/no propietario, pero no incluye el caso de turno ya cerrado.
- **Tipo de test sugerido:** Unit test (Mockito)
- **Nombre sugerido:** `SaleServiceTest.should_throw_when_cancelling_sale_from_closed_shift`

---

**GAP-M02: No hay test de validación del formato PIN (6 dígitos) en `CreateStaffRequest`**

- **Módulo:** users
- **Por qué importa:** El PIN debe ser exactamente 6 dígitos numéricos. No hay test que compruebe que `CreateStaffRequest` con PIN de 4 dígitos o con letras retorne 400.
- **Tipo de test sugerido:** Integration test (MockMvc) o unit test de validación
- **Nombre sugerido:** `UserIntegrationTest.should_return_400_when_pin_format_is_invalid`

---

**GAP-M03: No hay test de longitud mínima de password en `CreateAdminRequest`**

- **Módulo:** users
- **Por qué importa:** La contraseña de admin debe tener mínimo 8 caracteres. No hay test que lo verifique vía HTTP.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `UserIntegrationTest.should_return_400_when_admin_password_too_short`

---

**GAP-M04: No hay test de JWT expirado → 401**

- **Módulo:** shared/security
- **Por qué importa:** `SecurityIntegrationTest` cubre token ausente y token con firma inválida, pero no token expirado. Un token expirado con firma válida debe retornar 401, no 403.
- **Tipo de test sugerido:** Integration test (MockMvc) con token de expiración inmediata
- **Nombre sugerido:** `SecurityIntegrationTest.should_return_401_when_token_is_expired`

---

**GAP-M05: No hay test unitario para `should_throw_when_items_list_is_empty` en `SaleService`**

- **Módulo:** sales
- **Por qué importa:** Una venta sin ítems no tiene sentido de negocio. Si no hay validación `@NotEmpty` en el DTO, el servicio podría crear ventas con `subtotal = 0` y `finalTotal = 0`.
- **Tipo de test sugerido:** Unit test (Mockito) o verificar que `@NotEmpty` existe en `CreateSaleRequest.items`
- **Nombre sugerido:** `SaleServiceTest.should_throw_when_items_list_is_empty` (si no hay validación en DTO)

---

**GAP-M06: No hay test que verifique los campos nulos de auditoría en entidades activas/no-canceladas**

- **Módulo:** stores, users, sales
- **Por qué importa:** Para tiendas/usuarios activos, `deactivatedBy` y `deactivatedAt` deben ser `null` en la respuesta. Para ventas activas, `cancelledBy` debe ser `null`. No hay test explícito que lo garantice.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `StoreAuditIntegrationTest.should_return_null_deactivated_fields_for_active_store`

---

**GAP-M07: No hay test de `GET /api/incidents` con filtro `?status=OPEN`**

- **Módulo:** incidents
- **Por qué importa:** `IncidentFlowIntegrationTest` lista incidentes sin filtro. La variante `?status=OPEN` existe en el controller y en `IncidentServiceTest` unitario, pero no está cubierta vía HTTP.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `IncidentFlowIntegrationTest.should_list_open_incidents_with_status_filter`

---

**GAP-M08: No hay test del parámetro `?includeInactive=true` en `GET /api/stores`**

- **Módulo:** stores
- **Por qué importa:** El parámetro `includeInactive` cambia el comportamiento del query. `StoreServiceTest` lo cubre unitariamente (4 permutaciones), pero no hay test HTTP.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `StoreIntegrationTest.should_include_inactive_stores_when_param_is_true`

---

**GAP-M09: No hay test de `should_throw_when_shiftId_param_is_missing` para `GET /api/closures`**

- **Módulo:** closures
- **Por qué importa:** El controller lanza `BusinessException` cuando `shiftId` es null. Este caso de error no está cubierto vía HTTP.
- **Tipo de test sugerido:** Integration test (MockMvc)
- **Nombre sugerido:** `ShiftClosureIntegrationTest.should_return_400_when_shift_id_is_missing`

---

### 🟢 LOW

---

**GAP-L01: No hay test de trim de nombre/dirección en `StoreService.createStore`**

- **Módulo:** stores
- **Por qué importa:** `SaleService` normaliza `productName` y `note` (hay test). `StoreServiceTest` no verifica que el nombre de tienda con espacios se recorte.
- **Nombre sugerido:** `StoreServiceTest.should_normalize_name_and_address_on_create`

---

**GAP-L02: No hay test que garantice que `passwordHash`/`pinHash` no aparecen en `GET /api/admin/users/{id}`**

- **Módulo:** users
- **Por qué importa:** `UserAuditIntegrationTest` verifica la ausencia de estas fields en el contexto del test de deactivación. No existe un test dedicado y explícito para la respuesta de lectura normal.
- **Nombre sugerido:** `UserIntegrationTest.should_not_expose_password_hash_in_get_by_id_response`

---

**GAP-L03: No hay test del campo `search` en `GET /api/stores?search=`**

- **Módulo:** stores
- **Por qué importa:** `StoreServiceTest` cubre las 4 permutaciones de `search`/`includeInactive` en el servicio, pero no a nivel HTTP.
- **Nombre sugerido:** `StoreIntegrationTest.should_filter_stores_by_search_term`

---

**GAP-L04: No hay test de `WeeklyReportController` para el caso `?storeId=` faltante**

- **Módulo:** reports
- **Por qué importa:** Si el controller no valida explícitamente, Spring podría lanzar un error no manejado al intentar parsear un UUID nulo.
- **Nombre sugerido:** `WeeklyReportIntegrationTest.should_return_400_when_store_id_is_missing`

---

## Module-by-Module Matrix

| Módulo | Tests unitarios | Tests de integración | Tests de seguridad/ownership | Tests importantes faltantes | Estado |
|---|---|---|---|---|---|
| `auth` | ✅ 13 (login, me, inactive) | ⚠️ Parcial (solo en SecurityIntegrationTest) | ✅ token inválido, inactive | HTTP response de login/me no cubierto | 🟡 Parcial |
| `stores` | ✅ 15 (create, search, update, deactivate) | ⚠️ Solo deactivate + create | ✅ STAFF→403 en deactivate | GET/UPDATE sin test HTTP | 🟡 Parcial |
| `users` | ✅ 17 (create, list, get, deactivate) | ⚠️ Solo deactivate | ✅ STAFF→403 en endpoints admin | Create/list/get sin test HTTP | 🟡 Parcial |
| `shifts` | ✅ 23 (open, close, list, get) | ⚠️ Solo cierre de turno en ShiftClosureFlow | ✅ Ownership en ShiftServiceTest | Open/get/list sin test HTTP | 🟡 Parcial |
| `sales` | ✅ 32 (create, get, list, invoice, cancel) | ⚠️ Solo cancelledBy en SaleAudit | ✅ Ownership en SaleServiceTest + AuthorizationTest | Create/get/list/invoice sin test HTTP | 🟡 Parcial |
| `closures` | ✅ 8 (getById, getByShiftId) | ⚠️ Cierre creado en ShiftClosureFlow pero no leído | ✅ Ownership en ShiftClosureServiceTest | GET endpoints sin test HTTP | 🟡 Parcial |
| `incidents` | ✅ 15 (create, list, getById, resolve) | ✅ 6 (flow completo) | ✅ Ownership, STAFF no puede listar | getById sin test HTTP | 🟢 Bueno |
| `reviews` | ✅ 13+5 (create, list, get, weekly) | ✅ 8 | ✅ STAFF→403 | — | ✅ Sólido |
| `reports` | ✅ 4+4+5 (daily, monthly, weekly) | ✅ 4+4+3 | ✅ STAFF→403 en todos | Missing storeId param | ✅ Sólido |
| `shared/security` | ✅ 5 (JWT generation, validation) | ✅ 12 (SecurityIntegrationTest) | ✅ 401/403 cubiertos | JWT expirado no cubierto | 🟡 Parcial |

---

## Endpoint Coverage Matrix

| Endpoint | Test HTTP existe? | Auth/role cubierto? | Ownership cubierto? | Notas |
|---|---|---|---|---|
| `POST /api/auth/staff/login` | ⚠️ Implícito en helpers | ✅ | N/A | Sin test de respuesta dedicado |
| `POST /api/auth/admin/login` | ⚠️ Implícito en helpers | ✅ | N/A | Sin test de respuesta dedicado |
| `GET /api/auth/me` | ❌ | ✅ (Security) | N/A | No testado |
| `POST /api/stores` | ✅ (AuthorizationTest) | ✅ STAFF→403 | N/A | Solo test de autorización, no payload |
| `GET /api/stores` | ❌ | ❌ | N/A | No testado |
| `GET /api/stores/{id}` | ❌ | ❌ | N/A | No testado |
| `PATCH /api/stores/{id}` | ❌ | ❌ | N/A | No testado |
| `PATCH /api/stores/{id}/deactivate` | ✅ (StoreAudit) | ✅ STAFF→403 | N/A | Cubierto |
| `GET /api/admin/users` | ❌ | ❌ | N/A | Solo test unitario |
| `GET /api/admin/users/{id}` | ❌ | ❌ | N/A | Solo test unitario |
| `PATCH /api/admin/users/{id}/deactivate` | ✅ (UserAudit) | ✅ STAFF→403 | N/A | Cubierto |
| `POST /api/admin/users/staff` | ❌ | ❌ | N/A | No testado |
| `POST /api/admin/users/admin` | ❌ | ❌ | N/A | No testado |
| `POST /api/shifts/open` | ❌ | ❌ | N/A | No testado |
| `GET /api/shifts/current` | ❌ | ❌ | N/A | No testado |
| `GET /api/shifts/{id}` | ⚠️ Parcial (AuthorizationTest) | ✅ | ✅ STAFF→400 | Solo ownership negativo |
| `GET /api/shifts` | ❌ | ❌ | N/A | No testado |
| `POST /api/shifts/{id}/close` | ✅ (ShiftClosureFlow) | ⚠️ Parcial | ✅ Ownership implícito | Response payload no verificado |
| `POST /api/sales` | ❌ | ❌ | N/A | No testado |
| `GET /api/sales/{id}` | ⚠️ Parcial (AuthorizationTest) | ✅ | ✅ STAFF→400 | Solo ownership negativo |
| `GET /api/sales?shiftId=current` | ❌ | ❌ | N/A | No testado |
| `PATCH /api/sales/{id}/invoice` | ❌ | ❌ | N/A | No testado |
| `PATCH /api/sales/{id}/cancel` | ⚠️ Parcial (SaleAudit) | ⚠️ Parcial | ✅ Propietario | Solo happy path de audit |
| `GET /api/closures/{id}` | ❌ | ❌ | N/A | No testado |
| `GET /api/closures?shiftId=` | ❌ | ❌ | N/A | No testado |
| `POST /api/incidents` | ✅ (IncidentFlow) | ✅ | ✅ Otro turno→400 | Cubierto |
| `GET /api/incidents` | ✅ (IncidentFlow) | ✅ STAFF→403 | N/A | Cubierto; falta filtro `?status=` |
| `GET /api/incidents/{id}` | ❌ | ❌ | N/A | No testado |
| `PATCH /api/incidents/{id}/resolve` | ✅ (IncidentFlow) | ✅ STAFF→403 | N/A | Cubierto |
| `POST /api/admin/weekly-reviews` | ✅ (WeeklyAdminReview) | ✅ STAFF→403 | N/A | Cubierto |
| `GET /api/admin/weekly-reviews` | ✅ (WeeklyAdminReview) | ✅ | N/A | Cubierto |
| `GET /api/admin/weekly-reviews/{id}` | ✅ (WeeklyAdminReview) | ✅ | N/A | Cubierto |
| `GET /api/admin/reports/daily` | ✅ (DailyReport) | ✅ STAFF→403 | N/A | Cubierto |
| `GET /api/admin/reports/monthly` | ✅ (MonthlyReport) | ✅ STAFF→403 | N/A | Cubierto |
| `GET /api/admin/reports/weekly` | ✅ (WeeklyReport) | ✅ STAFF→403 | N/A | Cubierto |

---

## Business Rule Coverage Matrix

| Regla de negocio | Cubierta? | Test existente | Recomendación |
|---|---|---|---|
| Staff pertenece a una tienda | ✅ | `ShiftServiceTest.should_throw_when_staff_has_no_store` | — |
| Staff no puede tener más de un turno abierto | ✅ | `ShiftServiceTest.should_throw_when_staff_already_has_open_shift` | — |
| Ventas registradas solo con turno abierto | ✅ | `SaleServiceTest.should_throw_when_staff_has_no_open_shift` | — |
| Montos de pago = total final de venta | ✅ | `SaleServiceTest.should_throw_when_payment_total_does_not_match_final_total` | — |
| Ventas canceladas marcadas como CANCELLED (no eliminadas) | ✅ | `SaleAuditIntegrationTest` + `SaleServiceTest` | Añadir test de turno cerrado |
| Turno cerrado no puede reabrirse | ✅ | `ShiftServiceTest.should_throw_when_shift_is_already_closed` | — |
| Total de turno incluye ventas con factura pendiente | ✅ | `ShiftServiceTest.should_close_shift_with_status_closed_ok` | — |
| Caja debe quedar en 103 EUR tras cierre | ✅ | `ShiftServiceTest` (cálculo de `cashToWithdraw`) | — |
| `CLOSED_OK` cuando no hay diferencias | ✅ | `ShiftServiceTest.should_close_shift_with_status_closed_ok` | — |
| `CLOSED_WITH_INCIDENT` cuando hay diferencias | ✅ | `ShiftServiceTest.should_close_shift_with_status_closed_with_incident` | — |
| Ventas canceladas excluidas del cierre de turno | ✅ | `ShiftServiceTest.should_ignore_cancelled_sales_when_closing_shift` | — |
| Solo admin puede listar/resolver incidentes | ✅ | `IncidentServiceTest` + `IncidentFlowIntegrationTest` | — |
| Staff no puede acceder a incidentes de otros | ✅ | `IncidentServiceTest.should_throw_when_staff_reads_unrelated_incident` | — |
| Descuento LOYALTY_CARD requiere subtotal ≥ 25 EUR | ✅ | `SaleServiceTest.should_throw_when_loyalty_card_discount_subtotal_is_less_than_25` | — |
| Descuento VOUCHER_10_PERCENT = 10% | ✅ | `SaleServiceTest.should_create_sale_with_voucher_10_percent_discount` | — |
| Solo admin puede crear weekly reviews | ✅ | `WeeklyAdminReviewIntegrationTest` | — |
| No duplicate weekly review por tienda+semana | ✅ | `WeeklyAdminReviewServiceTest` | — |
| Sale cancelada no puede facturarse | ✅ | `SaleServiceTest.should_throw_when_cancelled_sale_is_marked_as_invoiced` | — |
| Sale ya facturada no puede volver a facturarse | ✅ | `SaleServiceTest.should_throw_when_sale_is_already_invoiced` | — |
| Solo staff propietario puede cancelar su venta | ✅ | `SaleServiceTest.should_throw_when_staff_cancels_other_staff_sale` | — |
| Admin puede cancelar cualquier venta | ✅ | `SaleServiceTest.should_cancel_sale_for_admin_and_set_cancelled_by` | — |
| No se puede cancelar venta de turno cerrado | ❌ | — | Añadir en `SaleServiceTest` (GAP-M01) |
| Contraseñas/PINs nunca en texto plano | ✅ (implícito en Argon2) | `UserAuditIntegrationTest` (no expone hash) | — |
| Mismo mensaje de error para username y credential inválidos | ✅ | `AuthServiceTest` + `SecurityIntegrationTest` | — |
| Solo staff puede abrir turnos | ✅ | `ShiftServiceTest.should_throw_when_user_is_not_staff` | — |
| Solo admin puede ver todos los turnos | ✅ | `ShiftServiceTest.should_return_all_shifts_when_authenticated_user_is_admin` | — |

---

## Security Test Coverage

### Autenticación

| Escenario | Cubierto? | Test |
|---|---|---|
| Token ausente → 401 | ✅ | `SecurityIntegrationTest` |
| Token con firma inválida → 401 | ✅ | `SecurityIntegrationTest` |
| Token expirado → 401 | ❌ | GAP-M04 |
| Token de usuario inactivo → 401 | ✅ | `SecurityIntegrationTest` |
| STAFF en endpoint admin → 403 | ✅ | `SecurityIntegrationTest`, `AuthorizationIntegrationTest` |
| ADMIN en endpoint admin → 200 | ✅ | `SecurityIntegrationTest` |

### JWT Internals

| Escenario | Cubierto? | Test |
|---|---|---|
| Generar y parsear token con secret válido | ✅ | `JwtServiceTest` |
| Secret vacío → excepción en construcción | ✅ | `JwtServiceTest` |
| Secret corto (<32 bytes) → excepción | ✅ | `JwtServiceTest` |
| Secret hardcodeado de fallback → excepción | ✅ | `JwtServiceTest` |
| Expiración ≤ 0 → excepción en construcción | ✅ | `JwtServiceTest` |

### Credenciales

| Escenario | Cubierto? | Test |
|---|---|---|
| PIN hasheado (Argon2), nunca plain | ✅ (implícito) | `AuthServiceTest` |
| Password hasheado (Argon2), nunca plain | ✅ (implícito) | `AuthServiceTest` |
| `passwordHash`/`pinHash` no expuestos en respuesta | ✅ | `UserAuditIntegrationTest` |
| Secretos no hardcodeados en `application.properties` | ✅ | Usa `${JWT_SECRET}` env var |

### Ownership / Isolation

| Escenario | Cubierto? | Test |
|---|---|---|
| STAFF no puede ver sale de otro staff | ✅ | `SaleServiceTest`, `AuthorizationIntegrationTest` |
| STAFF no puede ver turno de otro staff | ✅ | `ShiftServiceTest`, `AuthorizationIntegrationTest` |
| STAFF no puede crear incidente sobre turno ajeno | ✅ | `IncidentServiceTest`, `IncidentFlowIntegrationTest` |
| STAFF no puede ver incidente ajeno | ✅ | `IncidentServiceTest` |
| STAFF no puede ver cierre de turno ajeno | ✅ | `ShiftClosureServiceTest` |

---

## Test Quality Concerns

**TQC-01: Duplicación masiva de helpers en tests de integración**

Los 13 archivos de integración definen cada uno sus propios métodos privados `createStore()`, `createStaff()`, `createAdmin()`, `createOpenShift()`. Esto produce ~200 líneas de código duplicado. `IntegrationTestBase` solo provee `mockMvc` y el contenedor PostgreSQL, pero ningún helper. Un extracto representativo:

- `SaleAuditIntegrationTest.createStore()` — 12 líneas
- `StoreAuditIntegrationTest.createStore()` — ~12 líneas (idéntico)
- `UserAuditIntegrationTest.createStore()` — ~12 líneas (idéntico)

**Impacto:** Si el modelo `Store` cambia (e.g. campo obligatorio nuevo), habría que actualizar 10+ métodos. **No bloquea tests**, pero aumenta el coste de mantenimiento.

**Recomendación Phase 13:** Añadir helpers protegidos en `IntegrationTestBase` (o en una clase `IntegrationTestHelpers` separada que extienda de ella).

---

**TQC-02: `IncidentServiceTest` usa reflexión (`setEntityId`) para asignar IDs**

El método `setEntityId(entity, id)` usa `ReflectionUtils` o similar para establecer el campo `id` privado de entidades JPA (que no tiene setter público). Esto es frágil: si el nombre del campo cambia o si se introduce `@Embedded`, el test romperá silenciosamente.

**Impacto:** Bajo en el corto plazo (campo `id` es estable), pero es un antipatrón.

**Recomendación:** Considerar añadir un constructor de test o un factory method en la entidad protegido para tests, o persistir las entidades en el test con Testcontainers si el contexto lo requiere.

---

**TQC-03: `ShiftClosureFlowIntegrationTest` usa `Instant.now().toEpochMilli()` para nombres únicos**

```java
store.setName("Test Store " + Instant.now().toEpochMilli());
```

En una ejecución paralela de tests muy rápida, dos tests podrían generar el mismo timestamp. La mayoría de los otros tests de integración usan `UUID.randomUUID()` que es siempre único.

**Recomendación:** Cambiar a `"Test Store " + UUID.randomUUID()`.

---

**TQC-04: `IntegrationTestBase.@BeforeEach` está vacío — sin limpieza de BD**

Los tests de integración no hacen rollback ni truncan tablas entre tests. La aislación se basa en `UUID.randomUUID()` para evitar colisiones de unicidad. Esto es aceptable para este proyecto, pero significa que la base de datos de test acumula datos a lo largo de la ejecución.

**Impacto:** Tests que buscan "todos los elementos" (`findAll`) podrían ver datos de tests anteriores. Ejemplo: `DailyReportIntegrationTest` limita los resultados por `storeId` y fecha, lo que mitiga el problema. Pero si en el futuro se añade un test que haga `GET /api/stores` sin filtro y espere exactamente N tiendas, fallará de forma no determinista.

**Recomendación Phase 13:** Documentar este comportamiento explícitamente en `IntegrationTestBase`. Para tests que requieran conteos exactos, usar `storeId` u otro discriminador único.

---

**TQC-05: `ShiftClosureServiceTest` no cubre lógica de cierre — nombre misleading**

`ShiftClosureServiceTest` solo prueba `getById` y `getByShiftId` (8 tests de lectura). La lógica real de creación del cierre (cálculo de totales, `CLOSED_OK` vs `CLOSED_WITH_INCIDENT`, `cashToWithdraw`) vive en `ShiftServiceTest`. El nombre del archivo sugiere que cubre el `ShiftClosureService`, pero en realidad el `ShiftClosureService` solo tiene responsabilidad de lectura.

**Impacto:** No es un bug, pero puede confundir a quien quiera añadir tests de cierre — buscarían en `ShiftClosureServiceTest` y no encontrarían los tests de lógica.

**Recomendación:** Añadir un comentario en `ShiftClosureServiceTest` indicando que los tests de creación/cálculo están en `ShiftServiceTest.closeShift`.

---

**TQC-06: `WeeklyReportServiceTest` tiene solo 5 tests (no leído completamente)**

El módulo de `WeeklyReport` (agrupación de totales por staff en una semana) tiene solo 5 tests unitarios. Dependiendo de la complejidad del servicio, podría necesitar más casos (staff sin cierres, múltiples turnos por día, manejo de `null` en campos opcionales).

---

## CI Readiness

| Aspecto | Estado |
|---|---|
| Directorio `.github/workflows/` | ❌ No existe |
| GitHub Actions CI | ❌ No configurado |
| Maven Wrapper (`mvnw.cmd`) | ✅ Presente |
| Docker Compose para dev | ✅ Presente (`docker-compose.yml`) |
| Testcontainers (PostgreSQL en tests) | ✅ Self-contained, no requiere infra externa |
| Profile `test` con propiedades separadas | ✅ `application-test.properties` con JWT secret seguro |
| JWT secret en producción vía env var | ✅ `${JWT_SECRET}` |
| Surefire plugin configurado | ⚠️ No explícito en `pom.xml` (usa defaults de Spring Boot parent) |
| JaCoCo (cobertura de código) | ❌ No configurado |
| Fail-fast en test con errores | ⚠️ Comportamiento por defecto de Maven Surefire |

**Conclusión CI:** El proyecto está técnicamente listo para ejecutar en CI (Testcontainers es self-contained y no requiere PostgreSQL externo). Solo falta crear el workflow de GitHub Actions. La ausencia de JaCoCo impide tener métricas objetivas de cobertura de líneas.

---

## Recommended Phase 13 Implementation Plan

### Prioridad 1 — Tests de integración HTTP para flujos críticos del staff (GAP-C01 a GAP-C06)

Crear **`ShiftIntegrationTest.java`** y **`SaleIntegrationTest.java`** cubriendo:

1. `POST /api/shifts/open` → 201, payload correcto
2. `POST /api/shifts/{id}/close` → ya existe en `ShiftClosureFlowIntegrationTest`, pero añadir verificación de respuesta serializada
3. `GET /api/shifts/current` → respuesta correcta con shift abierto
4. `POST /api/sales` → 201, payload completo (items, payments, discounts, timestamps)
5. `GET /api/sales/{id}` → happy path y 404
6. `GET /api/sales?shiftId=current` → lista correcta
7. `PATCH /api/sales/{id}/invoice` → happy path
8. `PATCH /api/sales/{id}/cancel` → casos de error (400 otro staff, 400 ya cancelada)
9. `GET /api/closures/{id}` y `GET /api/closures?shiftId=` → happy path

### Prioridad 2 — Tests de integración HTTP para auth y admin (GAP-H01 a GAP-H05)

Crear **`AuthIntegrationTest.java`**, **`StoreIntegrationTest.java`**, **`UserIntegrationTest.java`** cubriendo:

1. `POST /api/auth/staff/login` y `POST /api/auth/admin/login` → respuesta completa
2. `GET /api/auth/me` → campos del usuario, sin hashes
3. `GET /api/stores`, `GET /api/stores/{id}`, `PATCH /api/stores/{id}` → happy paths
4. `GET /api/admin/users`, `GET /api/admin/users/{id}`, `POST /api/admin/users/staff`, `POST /api/admin/users/admin` → happy paths + validación

### Prioridad 3 — Refactoring de `IntegrationTestBase` (TQC-01)

Mover helpers comunes (`createStore`, `createStaff`, `createAdmin`, `createOpenShift`) a `IntegrationTestBase` como métodos `protected`. Esto reduce duplicación sin modificar lógica de negocio.

**Nota:** Este paso DEBE hacerse antes de añadir más tests de integración para no crear más duplicación.

### Prioridad 4 — Tests unitarios de gaps de negocio (GAP-M01, GAP-M05)

1. `SaleServiceTest.should_throw_when_cancelling_sale_from_closed_shift`
2. Verificar o añadir test de `items` vacío en `CreateSaleRequest`

### Prioridad 5 — Tests de seguridad adicionales (GAP-M04)

1. `SecurityIntegrationTest.should_return_401_when_token_is_expired`

### Prioridad 6 — CI / JaCoCo

1. Crear `.github/workflows/ci.yml` ejecutando `./mvnw test` con perfil `test`
2. Añadir plugin JaCoCo al `pom.xml` con report de cobertura mínima

### Prioridad 7 — Limpieza de calidad (TQC-02, TQC-03)

1. Cambiar `Instant.now().toEpochMilli()` → `UUID.randomUUID()` en `ShiftClosureFlowIntegrationTest`
2. Documentar en `ShiftClosureServiceTest` que la lógica de cálculo está en `ShiftServiceTest`

---

*Reporte generado en Phase 13. No se modificó ni creó ningún archivo de producción ni de test durante la elaboración de este reporte.*
