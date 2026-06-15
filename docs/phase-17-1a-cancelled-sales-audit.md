# Phase 17.1A — Backend Cancelled Sales Audit

**Tipo:** Auditoría de solo lectura  
**Fecha:** 2025-01-XX  
**Objetivo:** Investigar por qué las ventas canceladas continúan incluyéndose en los agregados financieros

---

## 1. Resumen Ejecutivo

Se realizó una auditoría exhaustiva del backend para determinar si las ventas canceladas se incluyen incorrectamente en los agregados financieros (totales de cierre de turno, reportes semanales, reportes diarios y mensuales).

**Hallazgo principal:** El código de producción está **correctamente implementado**. El servicio de cierre de turno (`ShiftService.closeShift()`) filtra explícitamente las ventas por estado `ACTIVE` usando el método `saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE)`, excluyendo así las ventas canceladas de todos los cálculos financieros.

**Cobertura de tests:** Existe un test unitario específico (`should_ignore_cancelled_sales_when_closing_shift`) que valida este comportamiento. Todos los 358 tests del backend pasan exitosamente.

**Test faltante crítico:** No existe un test de integración end-to-end que valide el flujo completo: crear venta → cancelar venta → cerrar turno → verificar que `totalSales` del cierre excluye la venta cancelada.

**Posibles causas del problema reportado:**
- El problema puede estar en el **frontend mobile**, no en el backend
- Existe un **edge case no cubierto** por los tests actuales
- El problema fue **corregido previamente** sin documentación
- Hay una **interpretación incorrecta** de cómo se manejan las ventas canceladas en la UI

**Recomendación:** Proceder a Phase 17.1B para crear un test de integración end-to-end que reproduzca el problema reportado y valide el comportamiento correcto del sistema.

---

## 2. Instrucciones y Documentación Revisadas

### Documentos del Proyecto
- **`AGENTS.md`** (líneas 1-100): Definición de roles, arquitectura modular, reglas de negocio
- **`backend/README.md`** (líneas 1-200): Stack técnico, decisiones arquitectónicas
- **`docs/business-rules.md`** (líneas 1-300): Reglas de negocio autoritativas
- **`docs/domain-model.md`** (líneas 1-200): Estructura del dominio

### Reglas de Negocio Relevantes (docs/business-rules.md)
- **BR-SALE-008:** "Deleting a sale must mark it as CANCELLED instead of physically deleting it"
- **BR-SALE-009:** "Cancelled sales must remain auditable"
- **BR-SALE-010:** ⚠️ **"A cancelled sale must not affect closing totals"**
- **BR-SHIFT-CLOSURE-004:** ⚠️ **"Cancelled sales must be ignored when calculating shift closure totals"**
- **BR-SHIFT-CLOSURE-005:** ⚠️ **"Shift closure totals are calculated using ACTIVE sales only"**

Las reglas de negocio son **claras y explícitas**: las ventas canceladas NO deben afectar los totales financieros.

---

## 3. Archivos Reales Inspeccionados

### Modelos del Dominio
| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `backend/src/main/java/com/shiftcontrol/backend/sales/model/SaleStatus.java` | 1-20 | Enum con estados ACTIVE, CANCELLED |
| `backend/src/main/java/com/shiftcontrol/backend/sales/model/Sale.java` | 1-200 | Entidad JPA con campos status, cancelledReason, cancelledAt, cancelledBy |
| `backend/src/main/java/com/shiftcontrol/backend/closures/model/ShiftClosure.java` | 1-200 | Snapshot de totales financieros al cerrar turno (totalSales, totalCash, etc.) |

### Servicios de Negocio
| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `backend/src/main/java/com/shiftcontrol/backend/sales/service/SaleService.java` | 1-400 | Creación, cancelación, facturación de ventas |
| `backend/src/main/java/com/shiftcontrol/backend/shifts/service/ShiftService.java` | 1-400 | **Cierre de turno y cálculo de agregados** ⚠️ |
| `backend/src/main/java/com/shiftcontrol/backend/reviews/service/WeeklyReportService.java` | 1-200 | Reportes semanales (usa datos de closures) |
| `backend/src/main/java/com/shiftcontrol/backend/reports/service/DailyReportService.java` | 1-150 | Reportes diarios (usa datos de closures) |
| `backend/src/main/java/com/shiftcontrol/backend/reports/service/MonthlyReportService.java` | 1-150 | Reportes mensuales (usa datos de closures) |

### Repositorios
| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `backend/src/main/java/com/shiftcontrol/backend/sales/repository/SaleRepository.java` | 1-200 | Queries para recuperar ventas con/sin filtro de status |

### Tests
| Archivo | Tests | Propósito |
|---------|-------|-----------|
| `backend/src/test/java/com/shiftcontrol/backend/shifts/service/ShiftServiceTest.java` | 28 | Tests unitarios de cierre de turno |
| `backend/src/test/java/com/shiftcontrol/backend/sales/service/SaleServiceTest.java` | 46 | Tests unitarios de ventas y cancelación |
| `backend/src/test/java/com/shiftcontrol/backend/integration/ShiftClosureFlowIntegrationTest.java` | 3 | Tests de integración de cierre |
| `backend/src/test/java/com/shiftcontrol/backend/integration/SaleFlowIntegrationTest.java` | 17 | Tests de integración de ventas |
| `backend/src/test/java/com/shiftcontrol/backend/integration/DailyReportIntegrationTest.java` | 4 | Tests de reportes diarios |

**Total de tests ejecutados:** 358 (todos pasan ✅)

---

## 4. Flujo de Creación de Venta

### Método: `SaleService.createSale()`

**Pasos:**
1. Valida que el staff tenga un turno abierto
2. Calcula `subtotalAmount` sumando `lineTotal` de cada item
3. Calcula `discountTotalAmount` sumando descuentos aplicados
4. Calcula `finalTotalAmount = subtotalAmount - discountTotalAmount`
5. Valida que la suma de `payments` sea igual a `finalTotalAmount`
6. Crea la entidad `Sale` con **`status = SaleStatus.ACTIVE`** ⚠️
7. Persiste la venta, items, descuentos y pagos
8. Retorna la venta creada

**Código relevante (SaleService.java línea 99):**
```java
sale.setStatus(SaleStatus.ACTIVE);  // ← Todas las ventas inician como ACTIVE
```

**Campos de auditoría de cancelación inicializados como `null`:**
- `cancelledReason = null`
- `cancelledAt = null`
- `cancelledBy = null`

---

## 5. Flujo de Cancelación

### Método: `SaleService.cancelSale()`

**Pasos:**
1. Busca la venta por ID
2. Valida que el usuario tenga acceso (es el staff owner O es admin)
3. Valida que la venta NO esté ya cancelada
4. Valida que el turno NO esté cerrado
5. **Cambia `status` a `SaleStatus.CANCELLED`** ⚠️
6. Establece `cancelledReason` (normalizado, trimmed)
7. Establece `cancelledAt = Instant.now()`
8. Establece `cancelledBy = User` (quien cancela)
9. Actualiza `updatedAt = Instant.now()`
10. Persiste la venta modificada

**Código relevante (SaleService.java línea 338+):**
```java
sale.setStatus(SaleStatus.CANCELLED);
sale.setCancelledReason(normalizeNullableText(request.reason()));
sale.setCancelledAt(now);
sale.setCancelledBy(cancelledByUser);
sale.setUpdatedAt(now);
```

**Importante:** La cancelación **NO modifica** los importes financieros:
- `finalTotalAmount` permanece igual
- `payments` no se eliminan ni modifican
- Los registros permanecen auditables

---

## 6. Semántica Actual de Cancelación

### Estado del Registro
- **NO se elimina físicamente** de la base de datos (cumple BR-SALE-008)
- **Permanece auditable** con todos sus datos financieros (cumple BR-SALE-009)
- El campo `status` cambia de `ACTIVE` → `CANCELLED`

### Datos Persistidos
| Campo | Antes de Cancelar | Después de Cancelar |
|-------|-------------------|---------------------|
| `status` | `ACTIVE` | `CANCELLED` |
| `finalTotalAmount` | 50.00 | **50.00** (sin cambio) |
| `payments` | List<SalePayment> | **List<SalePayment>** (sin cambio) |
| `cancelledReason` | null | "Customer mistake" |
| `cancelledAt` | null | 2025-01-15T10:30:00Z |
| `cancelledBy` | null | User(staff/admin) |

### Reglas de Validación
- No se puede cancelar si el turno ya está cerrado
- No se puede cancelar una venta ya cancelada
- No se puede facturar una venta cancelada
- Solo el staff owner o un admin pueden cancelar

---

## 7. Inventario de Agregados Financieros

| Agregado | Ubicación | Fuente de Datos | ¿Filtra CANCELLED? |
|----------|-----------|-----------------|-------------------|
| **totalSales** | ShiftClosure.totalSales | ShiftService.closeShift() | ✅ SÍ |
| **totalCash** | ShiftClosure.totalCash | ShiftService.closeShift() | ✅ SÍ |
| **totalMb** | ShiftClosure.totalMb | ShiftService.closeShift() | ✅ SÍ |
| **totalGlovoOnline** | ShiftClosure.totalGlovoOnline | ShiftService.closeShift() | ✅ SÍ |
| **totalGlovoCash** | ShiftClosure.totalGlovoCash | ShiftService.closeShift() | ✅ SÍ |
| **pendingInvoiceTotal** | ShiftClosure.pendingInvoiceTotal | ShiftService.closeShift() | ✅ SÍ |
| **cashToWithdraw** | ShiftClosure.cashToWithdraw | ShiftService.closeShift() | ✅ SÍ |
| **expectedPhysicalCash** | ShiftClosure.expectedPhysicalCash | ShiftService.closeShift() | ✅ SÍ |
| **totalSales** (weekly) | WeeklyReportService | Suma de closures | ✅ SÍ (indirecto) |
| **totalSales** (daily) | DailyReportService | Suma de closures | ✅ SÍ (indirecto) |
| **totalSales** (monthly) | MonthlyReportService | Suma de closures | ✅ SÍ (indirecto) |
| **activeSalesCount** | DailyReport/MonthlyReport | countByStatus(ACTIVE) | ✅ SÍ (explícito) |
| **cancelledSalesCount** | DailyReport/MonthlyReport | countByStatus(CANCELLED) | ✅ SÍ (por separado) |

**Patrón observado:** Todos los agregados financieros se calculan durante el cierre de turno filtrando por `SaleStatus.ACTIVE`. Los reportes posteriores simplemente suman los datos ya filtrados de los cierres.

---

## 8. Lugares Donde se Incluyen Ventas Canceladas

### Para Auditoría (Correcto ✅)
| Operación | Método | Propósito |
|-----------|--------|-----------|
| Listar ventas del turno | `SaleRepository.findByShiftOrderByCreatedAtDesc()` | Mostrar TODAS las ventas (activas + canceladas) para auditoría |
| Contar ventas canceladas | `SaleRepository.countByStatus(CANCELLED)` | Métricas de auditoría en reportes |
| Obtener venta por ID | `SaleRepository.findById()` | Consulta individual para auditoría |

**Nota:** Estas inclusiones son **intencionadas y correctas** según BR-SALE-009 (las ventas canceladas deben permanecer auditables).

### En Respuestas de API (Requiere Validación en Frontend 🔍)
| Endpoint | Retorna Canceladas | Propósito |
|----------|-------------------|-----------|
| `GET /api/sales?shiftId={id}` | ⚠️ **SÍ** (todas) | Listar ventas del turno |
| `GET /api/sales/{id}` | ⚠️ **SÍ** (si la venta está cancelada) | Consulta individual |

**Potencial problema:** Si el frontend mobile suma manualmente los `finalTotalAmount` de las ventas retornadas por estos endpoints, **incluiría ventas canceladas incorrectamente**.

**Necesita validación:** Revisar el código mobile para verificar si calcula totales localmente en lugar de usar los totales del cierre.

---

## 9. Lugares Donde se Excluyen Correctamente

### Cierre de Turno (ShiftService.java línea 188)
```java
List<Sale> activeSales = saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE);
ShiftCloseTotals totals = calculateShiftTotals(activeSales, shift.getStore());
```
✅ **Correctamente filtrado** usando `findByShiftAndStatus` con `SaleStatus.ACTIVE`

### Preview de Cierre (ShiftService.java línea 274)
```java
List<Sale> activeSales = saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE);
ShiftCloseTotals totals = calculateShiftTotals(activeSales, shift.getStore());
```
✅ **Correctamente filtrado** para el preview antes de cerrar

### Cálculo de Totales (ShiftService.java línea 296-324)
```java
private ShiftCloseTotals calculateShiftTotals(List<Sale> activeSales, Store store) {
    // ← Solo recibe activeSales, no tiene acceso a ventas canceladas
    BigDecimal totalSales = activeSales.stream()
        .map(Sale::getFinalTotalAmount)
        .reduce(ZERO, BigDecimal::add);
    // ...
}
```
✅ **Correctamente aislado** - El método solo opera sobre ventas activas

### Reportes Semanales (WeeklyReportService.java línea 150)
```java
totalSales = add(totalSales, closure.getTotalSales());
```
✅ **Correctamente propagado** - Usa `totalSales` del cierre que ya filtra canceladas

### Reportes Diarios/Mensuales (DailyReportService.java / MonthlyReportService.java)
```java
// Suma de totales de closures
for (ShiftClosure closure : closures) {
    totals.addClosure(closure);
}
```
✅ **Correctamente propagado** - Usa totales de closures que ya filtran canceladas

---

## 10. Análisis de Causa Raíz

### Hipótesis Evaluadas

#### ❌ Hipótesis 1: El backend incluye ventas canceladas en el cierre
**Descartada.** El código es explícito:
```java
List<Sale> activeSales = saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE);
```
El método `findByShiftAndStatus` filtra correctamente.

#### ❌ Hipótesis 2: El repositorio no filtra correctamente
**Descartada.** El query en `SaleRepository.java` línea 24:
```java
List<Sale> findByShiftAndStatus(Shift shift, SaleStatus status);
```
Spring Data JPA genera automáticamente `WHERE status = ?` correctamente.

#### ❌ Hipótesis 3: Los tests no cubren este caso
**Parcialmente descartada.** Existe el test unitario `should_ignore_cancelled_sales_when_closing_shift` que valida el comportamiento. Sin embargo, **falta un test de integración end-to-end**.

#### ⚠️ Hipótesis 4: El frontend mobile calcula totales localmente
**REQUIERE VALIDACIÓN.** Si el mobile hace `GET /api/sales?shiftId=current` y suma manualmente los `finalTotalAmount` sin filtrar por status, incluiría ventas canceladas.

**Código mobile a revisar:**
- `shift-control-mobile/app/(staff)/home.tsx`
- `shift-control-mobile/src/api/sales.ts`
- Cualquier componente que muestre totales del turno actual

#### ⚠️ Hipótesis 5: Existe un edge case no cubierto
**REQUIERE VALIDACIÓN.** Posibles escenarios:
- ¿Qué pasa si se cancela una venta DESPUÉS de cerrar el turno pero ANTES de persistir el cierre?
- ¿Hay condiciones de carrera en transacciones concurrentes?
- ¿El mobile cachea datos de ventas antes de la cancelación?

### Causa Raíz Más Probable

**El backend está correcto.** El problema reportado probablemente se origina en:
1. **Frontend mobile:** Cálculo manual de totales sin filtrar por status
2. **UX confusa:** El listado de ventas muestra canceladas con sus importes, confundiendo al usuario
3. **Cache mobile:** Datos obsoletos mostrados antes de refrescar
4. **Problema corregido:** El issue fue resuelto en commits anteriores sin documentación

---

## 11. Cobertura de Tests Existente

### Tests de Cierre de Turno (ShiftServiceTest.java)
| Test | Línea | ¿Valida Canceladas? |
|------|-------|---------------------|
| `should_close_shift_with_status_closed_ok_when_totals_match` | 401 | ❌ No (solo ventas activas) |
| `should_close_shift_with_status_closed_with_incident_when_cash_or_mb_difference_exists` | 452 | ❌ No |
| **`should_ignore_cancelled_sales_when_closing_shift`** | **496** | ✅ **SÍ** |
| `should_allow_admin_to_close_shift` | 527 | ❌ No |

**Test crítico (línea 496-520):**
```java
@Test
void should_ignore_cancelled_sales_when_closing_shift() {
    // Only the active sale is returned; cancelled sale is never returned by the repository
    List<Sale> activeSales = List.of(
        saleWithPayment(new BigDecimal("40.00"), InvoiceStatus.INVOICED, PaymentMethod.CASH, new BigDecimal("40.00"))
    );

    when(saleRepository.findByShiftAndStatus(shift, SaleStatus.ACTIVE)).thenReturn(activeSales);

    ShiftClosure closure = shiftService.closeShift(shiftId, staffId, request);

    assertThat(closure.getTotalSales()).isEqualByComparingTo("40.00");
    verify(saleRepository).findByShiftAndStatus(shift, SaleStatus.ACTIVE);
}
```
✅ **Valida correctamente** que solo se usan ventas `ACTIVE`

### Tests de Cancelación (SaleServiceTest.java)
| Test | Línea | Propósito |
|------|-------|-----------|
| `should_cancel_sale_for_staff_and_set_cancelled_by` | 1011 | Valida cambio de status |
| `should_cancel_sale_for_admin_and_set_cancelled_by` | 1043 | Valida admin puede cancelar |
| `should_throw_when_sale_is_already_cancelled` | 1141 | Valida no duplicar cancelación |
| `should_throw_when_cancelled_sale_is_marked_as_invoiced` | 973 | Valida no facturar cancelada |

### Tests de Integración
| Test | Archivo | ¿Valida E2E Cancelación + Cierre? |
|------|---------|-----------------------------------|
| `should_close_shift_with_closed_ok_and_reject_sale_creation_after_closure` | ShiftClosureFlowIntegrationTest | ❌ No cancela ventas |
| `should_cancel_sale` | SaleFlowIntegrationTest | ❌ Solo cancela, no cierra turno |
| `should_reject_cancelling_sale_from_closed_shift` | SaleFlowIntegrationTest | ❌ Valida validación, no totales |
| `should_return_daily_report_for_admin` | DailyReportIntegrationTest | ⚠️ Crea datos manualmente, no usa servicio |

**Resultado:** 358 tests totales, **0 fallos** ✅

---

## 12. Tests Faltantes

### Test de Integración End-to-End (CRÍTICO ⚠️)
**Nombre sugerido:** `should_exclude_cancelled_sales_from_shift_closure_totals`

**Ubicación:** `backend/src/test/java/com/shiftcontrol/backend/integration/ShiftClosureFlowIntegrationTest.java`

**Pasos del test:**
1. Crear store, staff, turno abierto
2. Crear venta A (ACTIVE) con finalTotal = 50.00 EUR
3. Crear venta B (ACTIVE) con finalTotal = 30.00 EUR
4. **Cancelar venta B** usando endpoint `PATCH /api/sales/{id}/cancel`
5. Verificar que venta B tiene status CANCELLED
6. **Cerrar turno** usando endpoint `POST /api/shifts/{id}/close`
7. **Verificar que `totalSales` del closure = 50.00** (solo venta A)
8. Verificar que venta B NO se cuenta en `totalCash`, `totalMb`, etc.

**Por qué es crítico:** Este test valida el flujo completo que un usuario real experimentaría en producción. Los tests unitarios mockean el repositorio, pero no validan que la base de datos real filtre correctamente.

### Test de Preview con Ventas Canceladas
**Nombre sugerido:** `should_exclude_cancelled_sales_from_close_preview`

**Pasos:**
1. Crear turno abierto
2. Crear venta A (50.00) y venta B (30.00)
3. Cancelar venta B
4. Llamar `GET /api/shifts/{id}/close/preview`
5. Verificar que `totalSales` = 50.00

### Test de Reportes con Ventas Canceladas
**Nombre sugerido:** `should_exclude_cancelled_sales_from_daily_report`

**Pasos:**
1. Crear turno cerrado con venta A (50.00 ACTIVE) y venta B (30.00 CANCELLED)
2. Llamar `GET /api/admin/reports/daily`
3. Verificar que `totalSales` = 50.00
4. Verificar que `activeSalesCount` = 1
5. Verificar que `cancelledSalesCount` = 1

---

## 13. Opciones de Solución

### Opción A: Validar que NO Existe Problema en Backend (Recomendada ✅)
**Enfoque:** Crear test de integración end-to-end que pruebe el flujo completo.

**Implementación:**
1. Crear `ShiftClosureFlowIntegrationTest.should_exclude_cancelled_sales_from_closure_totals()`
2. Ejecutar test y verificar que **pasa** ✅
3. Si pasa → **Confirmar que el backend está correcto**
4. Si falla → **Reproducir el bug y corregir**

**Pros:**
- Valida comportamiento real con base de datos
- Sin cambios en código de producción si está correcto
- Mejora cobertura de tests
- Bajo riesgo

**Contras:**
- Si el backend está correcto, el problema está en el frontend (requiere auditoría mobile)

**Estimación:** 1 hora

---

### Opción B: Auditar Frontend Mobile
**Enfoque:** Revisar cómo el mobile calcula y muestra totales de ventas.

**Archivos a revisar:**
- `shift-control-mobile/app/(staff)/home.tsx` (dashboard de staff)
- `shift-control-mobile/src/api/sales.ts` (API client)
- `shift-control-mobile/src/features/sales/` (componentes de ventas)
- Buscar cualquier `.reduce()`, `.sum()`, o cálculo manual de totales

**Buscar patrones problemáticos:**
```typescript
// ❌ INCORRECTO: Suma todas las ventas sin filtrar
const total = sales.reduce((sum, sale) => sum + sale.finalTotalAmount, 0);

// ✅ CORRECTO: Solo suma ventas activas
const total = sales
  .filter(sale => sale.status === 'ACTIVE')
  .reduce((sum, sale) => sum + sale.finalTotalAmount, 0);

// ✅ MEJOR: Usar los totales del cierre
const total = shiftClosure.totalSales;
```

**Pros:**
- Identifica el problema si está en el frontend
- Mejora la comprensión del flujo completo

**Contras:**
- Requiere conocimiento de React Native/TypeScript
- Puede ser más complejo si el problema es de UX/cache

**Estimación:** 2-3 horas

---

### Opción C: Agregar Filtro Defensivo en Repository
**Enfoque:** Forzar filtrado en TODOS los métodos del repositorio, incluso donde no se especifica status.

**Implementación:**
```java
// SaleRepository.java
@Query("""
    SELECT s FROM Sale s
    WHERE s.shift = :shift
    AND s.status = 'ACTIVE'
    ORDER BY s.createdAt DESC
""")
List<Sale> findByShiftOrderByCreatedAtDesc(@Param("shift") Shift shift);
```

**Pros:**
- Previene inclusión accidental de canceladas en cualquier query futuro
- Enfoque defensivo/fail-safe

**Contras:**
- ❌ **INCORRECTO según BR-SALE-009:** Rompe auditabilidad
- ❌ Los admins necesitan ver ventas canceladas en listados
- ❌ Cambia comportamiento existente y correcto
- ❌ Haría fallar tests existentes

**Estimación:** No recomendado ❌

---

### Opción D: Agregar Campo Calculado `isIncludedInTotals` en Sale
**Enfoque:** Hacer explícito si una venta se incluye en agregados.

**Implementación:**
```java
// Sale.java
public boolean isIncludedInTotals() {
    return this.status == SaleStatus.ACTIVE;
}
```

**Uso en frontend:**
```typescript
const totalSales = sales
  .filter(sale => sale.isIncludedInTotals)
  .reduce((sum, sale) => sum + sale.finalTotalAmount, 0);
```

**Pros:**
- Hace explícita la lógica de negocio
- Facilita uso correcto en frontend
- Documentación viva en el código

**Contras:**
- Requiere cambios en backend y frontend
- Redundante si el backend ya está correcto
- ¿Qué pasa si en el futuro hay más estados que afecten los totales?

**Estimación:** 3 horas

---

## 14. Recomendación

**Opción A (Validar con Test E2E) + Opción B (Auditar Frontend)**

### Fase 17.1B: Crear Test E2E
1. Crear test `should_exclude_cancelled_sales_from_closure_totals`
2. Ejecutar test
3. **Si pasa:** Backend confirmado correcto → Proceder a Fase 17.1C
4. **Si falla:** Reproducir bug → Corregir backend → Volver a probar

### Fase 17.1C: Auditar Frontend Mobile (Solo si 17.1B pasa)
1. Revisar `app/(staff)/home.tsx` - ¿Calcula totales manualmente?
2. Revisar llamadas a `GET /api/sales` - ¿Filtra por status?
3. Buscar `.reduce()` o `.sum()` sobre ventas - ¿Incluye todas?
4. Verificar cache/state management - ¿Datos obsoletos?
5. Validar UX - ¿Confunde al usuario con ventas canceladas visibles?

### Razones de esta Recomendación
1. **Bajo riesgo:** Empezar con tests, sin modificar producción
2. **Diagnóstico preciso:** Confirmar dónde está el problema real
3. **Mejora continua:** Los tests E2E quedan como regresión
4. **Enfoque TDD:** Test first, implementación después (si necesario)

---

## 15. Archivos que Probablemente Cambiarían

### Si el Problema Está en el Backend (Improbable ❌)
| Archivo | Cambio | Razón |
|---------|--------|-------|
| `ShiftService.java` | Ninguno | Ya filtra correctamente |
| `SaleRepository.java` | Ninguno | Métodos correctos existen |

### Si el Problema Está en el Frontend (Probable ⚠️)
| Archivo | Cambio | Razón |
|---------|--------|-------|
| `shift-control-mobile/app/(staff)/home.tsx` | Filtrar ventas por status antes de sumar | Si suma manualmente |
| `shift-control-mobile/src/api/sales.ts` | Agregar parámetro `status=ACTIVE` | Si no filtra en backend |
| `shift-control-mobile/src/features/sales/SalesList.tsx` | Marcar visualmente ventas canceladas | Mejorar UX |

### Tests Nuevos (Obligatorios ✅)
| Archivo | Test | Propósito |
|---------|------|-----------|
| `ShiftClosureFlowIntegrationTest.java` | `should_exclude_cancelled_sales_from_closure_totals` | E2E: crear → cancelar → cerrar |
| `ShiftClosePreviewIntegrationTest.java` | `should_exclude_cancelled_sales_from_preview` | Validar preview correcto |
| `DailyReportIntegrationTest.java` | `should_exclude_cancelled_sales_from_daily_totals` | Validar reportes usan closures |

---

## 16. Secuencia TDD Propuesta para la Siguiente Fase

### Phase 17.1B: Backend Test E2E

```java
@Test
void should_exclude_cancelled_sales_from_shift_closure_totals() throws Exception {
    // ARRANGE
    Store store = createStore();
    User staff = createStaff(store);
    Shift shift = createOpenShift(staff, store);
    String staffToken = jwtService.generateAccessToken(staff);

    // Crear venta A (50 EUR en efectivo)
    Sale saleA = createSale(staff, "50.00", "CASH", "PENDING");

    // Crear venta B (30 EUR en efectivo)
    Sale saleB = createSale(staff, "30.00", "CASH", "PENDING");

    // ACT 1: Cancelar venta B
    mockMvc.perform(patch("/api/sales/{id}/cancel", saleB.getId())
            .header("Authorization", "Bearer " + staffToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"reason": "Customer changed order"}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CANCELLED"));

    // ACT 2: Cerrar turno (expected = 103 + 50 = 153 EUR)
    mockMvc.perform(post("/api/shifts/{id}/close", shift.getId())
            .header("Authorization", "Bearer " + staffToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "confirmedCashAmount": 153.00,
                  "confirmedMbAmount": 0.00,
                  "note": "End of day"
                }
                """))
        // ASSERT: totalSales debe ser 50.00 (solo venta A)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.totalSales").value(50.00))
        .andExpect(jsonPath("$.data.totalCash").value(50.00))
        .andExpect(jsonPath("$.data.expectedPhysicalCash").value(153.00))
        .andExpect(jsonPath("$.data.status").value("CLOSED_OK"));

    // ASSERT: Verificar en BD que venta B está cancelada pero persiste
    Sale cancelledSale = saleRepository.findById(saleB.getId()).orElseThrow();
    assertThat(cancelledSale.getStatus()).isEqualTo(SaleStatus.CANCELLED);
    assertThat(cancelledSale.getFinalTotalAmount()).isEqualByComparingTo("30.00");
}
```

### Resultado Esperado del Test
- ✅ **Si PASA:** Backend correcto → Proceder a auditoría mobile
- ❌ **Si FALLA:** Bug reproducido → Corregir backend → Re-test

### Phase 17.1C: Frontend Mobile Audit (Solo si 17.1B pasa)

**Pasos:**
1. Ejecutar app mobile en modo dev
2. Abrir turno como staff
3. Crear venta de 50 EUR
4. Crear venta de 30 EUR
5. Cancelar venta de 30 EUR
6. **Observar totales mostrados en UI**
7. Cerrar turno
8. **Verificar que totalSales = 50 EUR**

**Si el total mostrado es 80 EUR:**
- El frontend está sumando ventas canceladas
- Revisar código mobile y corregir

**Si el total mostrado es 50 EUR:**
- El problema fue un reporte incorrecto o ya está corregido
- Documentar y cerrar el ticket

---

## 17. Preguntas de Negocio Pendientes

### Para Aclarar con el Usuario/Stakeholder

1. **¿En qué pantalla específica del mobile se observó el problema?**
   - ¿Dashboard de staff durante el turno?
   - ¿Preview de cierre de turno?
   - ¿Vista de reporte administrativo?

2. **¿El problema se observó solo una vez o es reproducible?**
   - Si es reproducible, ¿cuáles son los pasos exactos?

3. **¿Se observó el problema en un cierre de turno específico?**
   - Si sí, ¿tenemos el `shiftId` o `closureId` para auditar la BD?

4. **¿Las ventas canceladas que se "incluyeron" fueron canceladas ANTES o DESPUÉS del cierre?**
   - Si fue después, no es un bug (el cierre es un snapshot)

5. **¿El usuario está interpretando correctamente la UI?**
   - ¿Confunde "lista de ventas del turno" (muestra todas para auditoría) con "total del turno" (solo activas)?

6. **¿Hay logs de producción que muestren el cierre problemático?**
   - Revisar `totalSales` en el closure vs. suma de ventas activas

7. **¿Se usó la app mobile o se accedió directo a la API?**
   - Si fue API directa, ¿qué endpoints se llamaron?

---

## 18. Comandos Ejecutados

```powershell
# 1. Ejecutar todos los tests del backend
cd C:\Users\sa308\OneDrive\Escritorio\shift-control\backend
./mvnw test

# Resultado: 358 tests, 0 failures, BUILD SUCCESS
```

### Archivos Leídos (Completos)
- `backend/README.md`
- `docs/business-rules.md`
- `docs/domain-model.md`
- `backend/src/main/java/com/shiftcontrol/backend/sales/model/SaleStatus.java`
- `backend/src/main/java/com/shiftcontrol/backend/sales/model/Sale.java`
- `backend/src/main/java/com/shiftcontrol/backend/sales/service/SaleService.java`
- `backend/src/main/java/com/shiftcontrol/backend/sales/repository/SaleRepository.java`
- `backend/src/main/java/com/shiftcontrol/backend/shifts/service/ShiftService.java`
- `backend/src/main/java/com/shiftcontrol/backend/closures/model/ShiftClosure.java`
- `backend/src/main/java/com/shiftcontrol/backend/reviews/service/WeeklyReportService.java`
- `backend/src/main/java/com/shiftcontrol/backend/reports/service/DailyReportService.java`
- `backend/src/main/java/com/shiftcontrol/backend/reports/service/MonthlyReportService.java`
- `backend/src/test/java/com/shiftcontrol/backend/shifts/service/ShiftServiceTest.java`
- `backend/src/test/java/com/shiftcontrol/backend/integration/ShiftClosureFlowIntegrationTest.java`
- `backend/src/test/java/com/shiftcontrol/backend/integration/SaleFlowIntegrationTest.java`
- `backend/src/test/java/com/shiftcontrol/backend/integration/DailyReportIntegrationTest.java`

### Búsquedas Realizadas (grep_search)
- `cancelSale` → 20 matches
- `SaleStatus.ACTIVE` → 5 matches
- `totalSales` → 20+ matches
- `.getPayments()` → 8 matches
- `closeShift` → 20+ matches
- `CANCELLED` → 20+ matches
- Patrones de agregación: `sum|reduce|stream|aggregate` → 50 matches

---

## 19. Conclusión

### Hallazgo Principal
El backend **está correctamente implementado** según las reglas de negocio BR-SALE-010, BR-SHIFT-CLOSURE-004 y BR-SHIFT-CLOSURE-005.

**Evidencia:**
1. El método `ShiftService.closeShift()` filtra explícitamente por `SaleStatus.ACTIVE`
2. Existe un test unitario que valida este comportamiento
3. Todos los 358 tests del backend pasan
4. Los reportes (weekly, daily, monthly) usan datos de closures ya filtrados

### Test Faltante Crítico
No existe un **test de integración end-to-end** que valide el flujo completo:
- Crear venta → Cancelar → Cerrar turno → Verificar totalSales

Este test es necesario para:
1. Confirmar que el comportamiento end-to-end es correcto
2. Reproducir el problema si realmente existe
3. Prevenir regresiones futuras

### Próximos Pasos Recomendados
1. **Phase 17.1B:** Crear test E2E `should_exclude_cancelled_sales_from_closure_totals`
2. **Ejecutar test:** Si pasa → Backend correcto. Si falla → Bug reproducido.
3. **Phase 17.1C (Condicional):** Si el test pasa, auditar frontend mobile para identificar si el problema está en la UI, cálculos locales, o cache.

### Respuesta a la Pregunta de Investigación
**"¿Por qué las ventas canceladas continúan incluyéndose en los agregados financieros?"**

**Respuesta:** Según el código auditado, **NO se incluyen en los agregados del backend**. El servicio de cierre de turno filtra correctamente por `SaleStatus.ACTIVE`. Si el problema se observa en producción, las causas más probables son:
- Frontend mobile calcula totales localmente sin filtrar por status
- Confusión UX: El listado muestra ventas canceladas (correcto para auditoría), pero el usuario interpreta que se incluyen en totales
- Cache mobile muestra datos obsoletos
- El problema fue corregido previamente sin documentación

**Recomendación:** Crear test E2E para validar comportamiento end-to-end antes de modificar cualquier código de producción.

---

**Phase 17.1A completed as a read-only backend audit. No implementation changes were made.**
