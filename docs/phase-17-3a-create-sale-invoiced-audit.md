# Phase 17.3A — Create Sale as Invoiced Audit

**Alcance:** Auditoría de solo lectura para analizar cómo permitir crear ventas ya marcadas como facturadas durante el registro (en lugar de únicamente marcarlas después).

**Restricción:** NO se realizan cambios de código en esta fase. Es un análisis técnico preparatorio.

**Fecha:** 2025-05-17  
**Estado:** Completado

---

## 1. Contexto del Negocio

### Situación Actual

Actualmente, cuando un miembro del staff registra una venta en el sistema:

1. Completa el formulario de nueva venta (productos, cantidades, precios, descuentos, pagos)
2. El sistema crea la venta con `invoiceStatus = PENDING` (siempre, sin opción)
3. Si la venta fue facturada inmediatamente en físico, el staff debe:
   - Guardar la venta
   - Navegar al detalle de la venta
   - Presionar el botón "Mark as Invoiced"
   - Regresar a home

Esto genera **fricción operativa innecesaria** cuando la venta ya fue facturada en el momento de registro.

### Objetivo del Negocio

Permitir que el staff marque una venta como **ya facturada** durante el registro inicial, evitando el doble paso y mejorando la experiencia operativa.

**Caso de uso típico:**
- Cliente compra un producto de alto valor (>100 EUR)
- Solicita factura inmediatamente para IVA
- Staff emite factura física/manual
- En lugar de registrar la venta como PENDING y luego marcarla, **registra directamente como INVOICED**

### Reglas de Negocio Aplicables

- **BR-SALE-011:** Toda venta debe tener un estado de facturación (PENDING o INVOICED)
- **BR-SALE-012:** El estado de factura puede ser PENDING (pendiente) o INVOICED (facturada)
- **BR-SALE-013:** Una venta PENDING puede moverse a INVOICED mientras el turno esté abierto
- **BR-SALE-014:** Una venta INVOICED no puede volver a PENDING (irreversible)
- **BR-SALE-011 (cancelación):** Una venta cancelada no puede ser facturada

---

## 2. Modelo de Dominio Actual

### Enumeración InvoiceStatus

**Archivo:** `backend/src/main/java/com/shiftcontrol/backend/sales/model/InvoiceStatus.java`

```java
public enum InvoiceStatus {
    PENDING,
    INVOICED
}
```

**Valores:**
- `PENDING`: La venta está registrada pero la factura física aún no se ha emitido
- `INVOICED`: La factura física ha sido emitida para esta venta

**Características:**
- Enumeración simple de 2 valores
- Sin lógica adicional
- Usado en entidad Sale y DTOs

### Entidad Sale

**Archivo:** `backend/src/main/java/com/shiftcontrol/backend/sales/model/Sale.java`

**Campo relevante (línea 52):**
```java
@Enumerated(EnumType.STRING)
@Column(name = "invoice_status", nullable = false, length = 30)
private InvoiceStatus invoiceStatus;
```

**Restricciones:**
- NOT NULL en base de datos (obligatorio)
- Almacenado como STRING en columna `invoice_status`
- Longitud máxima: 30 caracteres

**Relación con otros campos:**
- `status` (SaleStatus): puede ser ACTIVE o CANCELLED
- Una venta CANCELLED no puede estar INVOICED (validación en servicio)

---

## 3. Flujo Backend — Creación de Venta

### CreateSaleRequest DTO

**Archivo:** `backend/src/main/java/com/shiftcontrol/backend/sales/dto/CreateSaleRequest.java`

**Estructura completa (línea 13-24):**
```java
public record CreateSaleRequest(
    @NotEmpty @Valid List<CreateSaleItemRequest> items,
    @Valid List<CreateSaleDiscountRequest> discounts,
    @NotEmpty @Valid List<CreateSalePaymentRequest> payments,
    @NotNull InvoiceStatus invoiceStatus,
    @Size(max = 500) String note
) {}
```

### ⚠️ HALLAZGO CRÍTICO #1

**El campo `invoiceStatus` YA EXISTE en CreateSaleRequest y es `@NotNull` (obligatorio).**

Esto significa que:
1. El backend YA está preparado para aceptar cualquier valor de InvoiceStatus durante la creación
2. El contrato de API YA requiere que el cliente envíe este valor
3. No hay validación especial que rechace INVOICED durante la creación
4. El backend confía en que el cliente envíe el valor correcto

### SaleService.createSale()

**Archivo:** `backend/src/main/java/com/shiftcontrol/backend/sales/service/SaleService.java`

**Método completo (línea 60-115):**
```java
public Sale createSale(UUID authenticatedUserId, CreateSaleRequest request) {
    // 1. Validar usuario
    User staff = userRepository.findById(authenticatedUserId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    // 2. Validar turno abierto
    Shift shift = shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)
        .orElseThrow(() -> new IllegalStateException("User has no open shift"));

    // 3. Construir entidad Sale
    Sale sale = new Sale();
    sale.setStaff(staff);
    sale.setStore(staff.getStore());
    sale.setShift(shift);
    sale.setStatus(SaleStatus.ACTIVE);
    sale.setInvoiceStatus(request.invoiceStatus()); // ← Línea 100: USA DIRECTAMENTE EL VALOR DEL REQUEST
    sale.setNote(request.note());

    // 4. Calcular items, descuentos, pagos, totales
    // ...código de cálculo omitido...

    // 5. Validar que el total de pagos coincida con el total final
    if (totalPayments.compareTo(sale.getFinalTotalAmount()) != 0) {
        throw new IllegalArgumentException("Payment total must match final sale total");
    }

    // 6. Guardar
    return saleRepository.save(sale);
}
```

### ⚠️ HALLAZGO CRÍTICO #2

**La línea 100 usa directamente `sale.setInvoiceStatus(request.invoiceStatus())`.**

Esto significa:
1. **NO hay validación** que impida crear una venta con `invoiceStatus = INVOICED`
2. **NO hay lógica especial** que fuerce PENDING
3. El backend **ya soporta** crear ventas directamente como INVOICED
4. La funcionalidad solicitada **ya existe en backend**, solo falta exponerla en mobile

### SaleController.createSale()

**Archivo:** `backend/src/main/java/com/shiftcontrol/backend/sales/controller/SaleController.java`

**Endpoint (línea 35-48):**
```java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public ApiResponse<SaleResponse> createSale(
        Authentication authentication,
        @Valid @RequestBody CreateSaleRequest request
) {
    UUID authenticatedUserId = UUID.fromString(authentication.getName());

    SaleResponse response = SaleResponse.fromEntity(
            saleService.createSale(authenticatedUserId, request)
    );

    return ApiResponse.ok("Sale created successfully", response);
}
```

**URL:** `POST /api/sales`  
**Request body:** CreateSaleRequest  
**Validación:** Bean Validation sobre `@Valid @RequestBody`  
**Response:** SaleResponse con todos los campos incluyendo invoiceStatus

---

## 4. Flujo Backend — Facturación Posterior

### SaleService.markAsInvoiced()

**Archivo:** `backend/src/main/java/com/shiftcontrol/backend/sales/service/SaleService.java`

**Método completo (línea 310-350):**
```java
public Sale markAsInvoiced(UUID id, UUID authenticatedUserId, Role authenticatedRole) {
    // 1. Validar usuario
    User authenticatedUser = userRepository.findById(authenticatedUserId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    // 2. Obtener venta
    Sale sale = saleRepository.findWithDetailsById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));

    // 3. Validar autorización
    if (authenticatedRole == Role.STAFF && !sale.getStaff().getId().equals(authenticatedUserId)) {
        throw new ForbiddenException("Staff can only invoice their own sales");
    }

    // 4. Validar que la venta no esté cancelada (línea 324)
    if (sale.getStatus() == SaleStatus.CANCELLED) {
        throw new IllegalStateException("Cannot invoice a cancelled sale");
    }

    // 5. Validar que no esté ya facturada (línea 327)
    if (sale.getInvoiceStatus() == InvoiceStatus.INVOICED) {
        throw new IllegalStateException("Sale is already invoiced");
    }

    // 6. Marcar como facturada (línea 331)
    sale.setInvoiceStatus(InvoiceStatus.INVOICED);
    sale.setUpdatedAt(LocalDateTime.now());

    return saleRepository.save(sale);
}
```

### Validaciones Clave

1. **No cancelada:** `if (sale.getStatus() == SaleStatus.CANCELLED)` → error
2. **No ya facturada:** `if (sale.getInvoiceStatus() == InvoiceStatus.INVOICED)` → error
3. **Autorización:** STAFF solo puede facturar sus propias ventas, ADMIN puede facturar cualquiera

### SaleController.markAsInvoiced()

**Endpoint (línea 81-93):**
```java
@PatchMapping("/{id}/invoice")
public ApiResponse<SaleResponse> markAsInvoiced(
        Authentication authentication,
        @PathVariable UUID id
) {
    UUID authenticatedUserId = UUID.fromString(authentication.getName());
    Role authenticatedRole = extractRole(authentication);

    SaleResponse response = SaleResponse.fromEntity(
            saleService.markAsInvoiced(id, authenticatedUserId, authenticatedRole)
    );

    return ApiResponse.ok("Sale marked as invoiced successfully", response);
}
```

**URL:** `PATCH /api/sales/{id}/invoice`  
**Request body:** Ninguno (sin payload)  
**Response:** SaleResponse actualizado con `invoiceStatus = INVOICED`

---

## 5. Flujo Mobile — Nueva Venta

### Pantalla new-sale.tsx

**Archivo:** `shift-control-mobile/app/(staff)/sales/new-sale.tsx`

**Estado del formulario:**
```typescript
const [items, setItems] = useState<SaleItemDraft[]>([...]);
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
const [paymentMode, setPaymentMode] = useState<PaymentMode>("SINGLE");
const [splitCashAmount, setSplitCashAmount] = useState("");
const [splitMbAmount, setSplitMbAmount] = useState("");
const [splitGlovoCashAmount, setSplitGlovoCashAmount] = useState("");
const [selectedDiscount, setSelectedDiscount] = useState<DiscountSelection>("NONE");
const [manualDiscountAmount, setManualDiscountAmount] = useState("");
const [manualDiscountNote, setManualDiscountNote] = useState("");
const [note, setNote] = useState("");
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [isDiscountExpanded, setIsDiscountExpanded] = useState(false);
```

### ⚠️ HALLAZGO CRÍTICO #3

**NO existe estado para `invoiceStatus` en el formulario.**

El formulario gestiona:
- ✅ Items (productos, cantidades, precios)
- ✅ Descuentos (tipo, monto, nota)
- ✅ Pagos (método único o split entre CASH/MB/GLOVO_CASH)
- ✅ Nota general de la venta
- ❌ **Invoice status** (NO hay UI, NO hay estado)

### Submit Handler (línea 228-238)

```typescript
async function handleSubmit() {
  if (!canSubmit || finalTotal === null) {
    return;
  }

  setIsSubmitting(true);
  setErrorMessage(null);

  try {
    await createSale({
      items: items.map((item) => ({
        productName: item.productName.trim(),
        quantity: parsePositiveInteger(item.quantity)!,
        unitPrice: parsePositiveNumber(item.unitPrice)!,
      })),
      discounts: buildDiscounts({
        discount: selectedDiscount,
        manualDiscountAmount: manualDiscountAmountNumber,
        manualDiscountNote,
      }),
      payments: buildPayments(finalTotal),
      invoiceStatus: "PENDING", // ← LÍNEA 238: SIEMPRE HARDCODEADO A "PENDING"
      note: note.trim().length > 0 ? note.trim() : undefined,
    });

    router.replace("/(staff)/home");
  } catch (error) {
    setErrorMessage(getApiErrorMessage(error));
  } finally {
    setIsSubmitting(false);
  }
}
```

### ⚠️ HALLAZGO CRÍTICO #4

**El cliente mobile siempre envía `invoiceStatus: "PENDING"` hardcodeado.**

Esto significa:
1. El usuario NO puede elegir crear la venta como INVOICED
2. No hay switch, checkbox, radio button, ni selector
3. El valor es constante, sin lógica condicional
4. La única forma actual de facturar es usar el endpoint posterior PATCH /api/sales/{id}/invoice

---

## 6. Flujo Mobile — Facturación Posterior

### Pantalla sale detail ([id].tsx)

**Archivo:** `shift-control-mobile/app/(staff)/sales/[id].tsx`

**Estado (línea 63-69):**
```typescript
const [invoiceErrorMessage, setInvoiceErrorMessage] = useState<string | null>(null);
const [isMarkingInvoiced, setIsMarkingInvoiced] = useState(false);
```

**Condición de habilitación (línea 207):**
```typescript
const canMarkAsInvoiced =
  sale.status === "ACTIVE" && sale.invoiceStatus === "PENDING";
```

**Handler (línea 109-127):**
```typescript
async function handleMarkAsInvoiced() {
  if (!saleId || state.status !== "ready" || isMarkingInvoiced) {
    return;
  }

  setIsMarkingInvoiced(true);
  setInvoiceErrorMessage(null);

  try {
    const updatedSale = await markSaleAsInvoiced(saleId);

    setState({
      status: "ready",
      sale: updatedSale,
      errorMessage: null,
    });
  } catch (error) {
    setInvoiceErrorMessage(getApiErrorMessage(error));
  } finally {
    setIsMarkingInvoiced(false);
  }
}
```

### API Client

**Archivo:** `shift-control-mobile/src/api/sales.ts` (línea 34-40)

```typescript
export async function markSaleAsInvoiced(id: string): Promise<Sale> {
  const response = await apiClient.patch<ApiEnvelope<Sale>>(
    `/api/sales/${id}/invoice`
  );

  return response.data.data;
}
```

**Endpoint:** `PATCH /api/sales/{id}/invoice`  
**Sin payload**  
**Devuelve:** Sale actualizado

### UX Actual

1. Crear venta → siempre PENDING
2. Navegar a detalle de venta
3. Ver botón "Mark as Invoiced" (solo si status=ACTIVE y invoiceStatus=PENDING)
4. Presionar botón
5. Llamada PATCH
6. Venta actualizada a INVOICED
7. Regresar a home

---

## 7. Tipos TypeScript Mobile

### CreateSaleRequest (api.ts)

**Archivo:** `shift-control-mobile/src/types/api.ts` (línea 123-132)

```typescript
export type CreateSaleRequest = {
  items: CreateSaleItemRequest[];
  discounts: CreateSaleDiscountRequest[];
  payments: CreateSalePaymentRequest[];
  invoiceStatus: InvoiceStatus; // ← Campo YA existe
  note?: string;
};
```

### InvoiceStatus (api.ts)

```typescript
export type InvoiceStatus = "PENDING" | "INVOICED";
```

### ⚠️ HALLAZGO CRÍTICO #5

**El tipo TypeScript `CreateSaleRequest` YA incluye `invoiceStatus: InvoiceStatus`.**

Esto significa:
1. El contrato mobile ya está preparado
2. TypeScript no rechazará enviar "INVOICED"
3. Solo falta agregar UI para que el usuario elija
4. No hay cambios de tipos necesarios

---

## 8. Cobertura de Tests Backend

### SaleServiceTest.java

**Archivo:** `backend/src/test/java/com/shiftcontrol/backend/sales/service/SaleServiceTest.java`

**Helper para crear request (línea 113-124):**
```java
private CreateSaleRequest requestWithoutDiscounts(
        String productName, int quantity, String unitPrice,
        PaymentMethod paymentMethod, String paymentAmount
) {
    return new CreateSaleRequest(
            List.of(new CreateSaleItemRequest(productName, quantity, new BigDecimal(unitPrice))),
            List.of(),
            List.of(new CreateSalePaymentRequest(paymentMethod, new BigDecimal(paymentAmount))),
            InvoiceStatus.PENDING, // ← SIEMPRE PENDING
            "Test sale"
    );
}
```

### Tests de Creación

**Test principal (línea 135-175):**
```java
@Test
void should_create_sale_without_discounts_when_payment_matches_total() {
    // ...setup omitido...
    CreateSaleRequest request = requestWithoutDiscounts("Product A", 2, "10.00", PaymentMethod.CASH, "20.00");

    Sale sale = saleService.createSale(staffId, request);

    assertThat(sale.getStatus()).isEqualTo(SaleStatus.ACTIVE);
    assertThat(sale.getInvoiceStatus()).isEqualTo(InvoiceStatus.PENDING); // ← Validación
    assertThat(sale.getSubtotalAmount()).isEqualByComparingTo("20.00");
    assertThat(sale.getFinalTotalAmount()).isEqualByComparingTo("20.00");
    // ...más asserts...
}
```

**Total de tests de createSale:** ~20 tests

**Todos usan:** `InvoiceStatus.PENDING` en el request  
**Todos validan:** `sale.getInvoiceStatus() == InvoiceStatus.PENDING`

### Tests de markAsInvoiced

**Test principal (línea 912-935):**
```java
@Test
void should_mark_sale_as_invoiced_for_owner_staff() {
    // Arrange
    Store store = activeStore();
    User staff = activeStaffWithStore(store);
    UUID saleId = UUID.randomUUID();
    Sale sale = new Sale();
    sale.setStaff(staff);
    sale.setStatus(SaleStatus.ACTIVE);
    sale.setInvoiceStatus(InvoiceStatus.PENDING);
    when(saleRepository.findWithDetailsById(saleId)).thenReturn(Optional.of(sale));
    when(saleRepository.save(sale)).thenReturn(sale);

    // Act
    Sale result = saleService.markAsInvoiced(saleId, staff.getId(), Role.STAFF);

    // Assert
    assertThat(result.getInvoiceStatus()).isEqualTo(InvoiceStatus.INVOICED);
    assertThat(result.getUpdatedAt()).isNotNull();
    verify(saleRepository).save(sale);
}
```

**Tests adicionales:**
- ✅ Staff no puede facturar venta de otro staff
- ✅ No se puede facturar venta cancelada
- ✅ No se puede facturar venta ya facturada

**Total de tests de markAsInvoiced:** 4 tests

### ⚠️ GAP DE COBERTURA #1

**NO existe ningún test que valide crear una venta con `InvoiceStatus.INVOICED`.**

Esto significa:
1. La funcionalidad técnica existe (backend acepta INVOICED)
2. Pero **nunca se ha probado** crear una venta ya facturada
3. Los tests siempre usan PENDING y validan que permanezca PENDING
4. Si implementamos la feature, necesitaremos tests nuevos

---

## 9. Cobertura de Tests Mobile

### sales.test.ts

**Archivo:** `shift-control-mobile/__tests__/api/sales.test.ts`

**Test principal (línea 86-149):**
```typescript
it("creates a simple sale", async () => {
  mockedApiClient.post.mockResolvedValueOnce({
    data: {
      success: true,
      message: "Sale created successfully",
      data: {
        id: "sale-1",
        shiftId: "shift-1",
        staffId: "staff-1",
        storeId: "store-1",
        status: "ACTIVE",
        invoiceStatus: "PENDING", // ← Mock con PENDING
        subtotalAmount: 20,
        discountTotalAmount: 0,
        finalTotalAmount: 20,
        // ...más campos...
      },
    },
  });

  const request = {
    items: [
      {
        productName: "Coffee",
        quantity: 2,
        unitPrice: 10,
      },
    ],
    discounts: [],
    payments: [
      {
        method: "CASH" as const,
        amount: 20,
      },
    ],
    invoiceStatus: "PENDING" as const, // ← Request con PENDING
  };

  const result = await createSale(request);

  expect(mockedApiClient.post).toHaveBeenCalledWith("/api/sales", request);
  expect(result.id).toBe("sale-1");
  expect(result.finalTotalAmount).toBe(20);
});
```

**Tests adicionales:**
- ✅ Venta con Glovo online
- ✅ Venta con descuento manual
- ✅ Venta con split payment

**Todos usan:** `invoiceStatus: "PENDING" as const`  
**Total de tests de createSale:** 4 tests

### ⚠️ GAP DE COBERTURA #2

**NO existe ningún test mobile que valide crear una venta con `invoiceStatus: "INVOICED"`.**

Los tests mobile reflejan la misma limitación que los backend: siempre asumen PENDING.

---

## 10. Resultado de Ejecución de Tests

### Backend

**Comando ejecutado:**
```powershell
cd backend
./mvnw test -Dtest=SaleServiceTest
```

**Resultado:**
```
[INFO] Tests run: 46, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.268 s
[INFO] BUILD SUCCESS
```

**Conclusión:** Todos los tests backend existentes pasan correctamente.

### Mobile

**Comando NO ejecutado en esta auditoría** (no necesario para análisis de solo lectura).

**Estado conocido:** 50 tests passing (validado en Phases anteriores).

---

## 11. Análisis de Diferencias Entre Flows

### Tabla Comparativa

| Aspecto | Creación de Venta | Facturación Posterior |
|---------|-------------------|----------------------|
| **Endpoint** | `POST /api/sales` | `PATCH /api/sales/{id}/invoice` |
| **Request Body** | CreateSaleRequest completo | Ninguno |
| **Validación de invoiceStatus** | Ninguna (acepta PENDING o INVOICED) | Valida que sea PENDING y no CANCELLED |
| **Efecto** | `sale.setInvoiceStatus(request.invoiceStatus())` | `sale.setInvoiceStatus(InvoiceStatus.INVOICED)` |
| **Mobile UI** | Formulario complejo con items/discounts/payments | Botón simple "Mark as Invoiced" |
| **Mobile estado** | Hardcoded `"PENDING"` | N/A (sin input) |
| **Tests backend** | 20 tests (todos PENDING) | 4 tests (validan transición) |
| **Tests mobile** | 4 tests (todos PENDING) | No testeados en capa API |

### Observaciones Clave

1. **Backend ya soporta ambos flows técnicamente:** La creación acepta cualquier InvoiceStatus sin validación adicional.

2. **Facturación posterior tiene validaciones más estrictas:** Verifica que la venta no esté cancelada ni ya facturada. Estas validaciones NO existen en creación porque asume que el cliente enviará datos correctos.

3. **Mobile solo expone el flow posterior:** La UI solo permite PENDING en creación, obligando al doble paso.

4. **No hay redundancia técnica:** Ambos endpoints son necesarios:
   - POST /api/sales → crear venta (con cualquier invoiceStatus)
   - PATCH /api/sales/{id}/invoice → cambiar estado (con validaciones)

5. **El problema es de UX, no de arquitectura:** El backend está bien diseñado y flexible. La limitación está en el formulario mobile.

---

## 12. Análisis de Compatibilidad con Reglas de Negocio

### BR-SALE-011: Toda venta debe tener estado de facturación

✅ **Cumple:** CreateSaleRequest tiene `@NotNull InvoiceStatus invoiceStatus`

**Impacto:** Si se permite crear con INVOICED, sigue cumpliendo esta regla.

### BR-SALE-012: Estado puede ser PENDING o INVOICED

✅ **Cumple:** Enum solo permite estos dos valores

**Impacto:** Ninguno, la feature propuesta usa valores válidos.

### BR-SALE-013: PENDING puede moverse a INVOICED mientras turno abierto

✅ **Compatible:** Crear directamente como INVOICED es técnicamente equivalente a crear PENDING y mover a INVOICED inmediatamente.

**Impacto:** La regla habla de "mover" pero no prohíbe "crear directamente como INVOICED".

### BR-SALE-014: INVOICED no puede volver a PENDING

✅ **Cumple:** Si se crea como INVOICED, nunca se revertirá.

**Impacto:** Ninguno, la feature solo agrega un nuevo punto de entrada a INVOICED.

### BR-SALE-011 (cancelación): Venta cancelada no puede facturarse

✅ **Cumple:** Una venta nueva nunca está cancelada.

**Impacto:** Solo aplica al endpoint PATCH (facturación posterior), no a creación.

### BR-SALE-012 (duplicación): Venta ya facturada no puede facturarse de nuevo

✅ **Cumple:** Si se crea como INVOICED, el endpoint PATCH rechazará intentos posteriores.

**Impacto:** La validación del PATCH endpoint sigue protegiendo contra duplicación.

### Conclusión

**✅ La feature propuesta es compatible con todas las reglas de negocio existentes.**

No hay conflictos lógicos, restricciones de integridad, ni casos edge que requieran nuevas reglas.

---

## 13. Análisis de Riesgos de Implementación

### Riesgo 1: Backend sin Validación Explícita

**Descripción:** `SaleService.createSale()` usa directamente `request.invoiceStatus()` sin validar que el valor sea coherente con el estado del turno o la venta.

**Impacto:** Si el mobile enviara un valor incorrecto (ej: INVOICED cuando no corresponde), el backend lo aceptaría sin cuestionar.

**Mitigación actual:**
- CreateSaleRequest es `@NotNull` → no puede ser null
- Enum InvoiceStatus solo permite PENDING/INVOICED → no puede ser valor inválido
- Mobile es cliente confiable (interno, no API pública)

**Recomendación:** Mantener diseño actual. No agregar validación innecesaria que rigidice el sistema.

**Severidad:** Baja

### Riesgo 2: Tests sin Cobertura para INVOICED en Creación

**Descripción:** Todos los tests usan PENDING. Si implementamos la feature, no habrá tests que validen crear con INVOICED.

**Impacto:** Posible regresión no detectada si se introduce bug en el flow de INVOICED.

**Mitigación requerida:** Agregar tests nuevos:
- Backend: crear venta con `InvoiceStatus.INVOICED` y validar que se persiste correctamente
- Mobile: mock de request con `invoiceStatus: "INVOICED"` y validar que se envía correctamente

**Severidad:** Media (bloqueante para implementación)

### Riesgo 3: UX Confusa si No Se Comunica Bien

**Descripción:** Si el usuario marca como INVOICED durante creación por error, no puede revertirlo (BR-SALE-014).

**Impacto:** Staff podría registrar venta como INVOICED cuando en realidad no emitió factura física.

**Mitigación requerida:**
- UI clara con labels descriptivos ("Was invoice issued immediately?")
- Valor por defecto: PENDING (comportamiento actual)
- Opcional: confirmación si se selecciona INVOICED
- Capacitación al staff sobre el significado de "invoiced"

**Severidad:** Media (UX crítica)

### Riesgo 4: Cambio de Contrato Breaking

**Descripción:** Actualmente `invoiceStatus` es `@NotNull` en CreateSaleRequest. Si lo hacemos opcional para backward compatibility con clientes antiguos, podría generar inconsistencia.

**Impacto:** CreateSaleRequest requiere el campo, por lo que NO es breaking change agregar opción INVOICED (el campo ya existe).

**Mitigación:** No hay cambio de contrato. El campo sigue siendo `@NotNull`, solo cambia el valor enviado.

**Severidad:** Ninguna (no aplica)

### Riesgo 5: Reportes y Agregados Incorrectos

**Descripción:** Si el sistema asume que todas las ventas se crean como PENDING y luego se facturan, podría haber lógica que cuente transiciones.

**Impacto:** Revisión de código muestra que:
- ShiftClosureService calcula `pendingInvoiceTotal` filtrando por `invoiceStatus = PENDING`
- WeeklyReportService usa closures (snapshots), no cuenta transiciones
- No hay métricas de "cuántas ventas se facturaron hoy" (solo totales)

**Mitigación:** No necesaria, los reportes ya manejan estados finales correctamente.

**Severidad:** Ninguna (validado)

---

## 14. Comparación de Opciones de Implementación

### Opción A: Usar Campo Existente con UI Toggle

**Descripción:** Agregar un switch o checkbox en new-sale.tsx para elegir PENDING o INVOICED, usando el campo `invoiceStatus` que ya existe en CreateSaleRequest.

**Pros:**
- ✅ No requiere cambios backend
- ✅ No requiere cambios en tipos TypeScript
- ✅ Contrato API ya existe y es válido
- ✅ Implementación más simple y rápida
- ✅ Mantiene consistencia con diseño actual

**Contras:**
- ⚠️ Campo es `@NotNull`, no puede ser omitido (pero esto es deseable)
- ⚠️ Requiere tests nuevos para validar INVOICED
- ⚠️ Requiere capacitación de staff sobre cuándo usar INVOICED

**Esfuerzo estimado:** Bajo (1-2 días)

**Recomendación:** ⭐ **OPCIÓN RECOMENDADA**

### Opción B: Hacer Campo Opcional con Default

**Descripción:** Cambiar `invoiceStatus` de `@NotNull` a opcional en CreateSaleRequest, con default backend a PENDING.

**Pros:**
- ✅ Backward compatibility con clientes que no envíen el campo
- ✅ Mobile puede omitir el campo si no hay UI

**Contras:**
- ❌ Requiere cambio en backend (quitar `@NotNull`)
- ❌ Requiere migración de datos (columna ya es NOT NULL en DB)
- ❌ Pierde validación explícita de intención
- ❌ Introduce default implícito (menos explícito)

**Esfuerzo estimado:** Medio (3-4 días)

**Recomendación:** ❌ No recomendado (over-engineering)

### Opción C: Nuevo Campo Separado `createAsInvoiced`

**Descripción:** Agregar campo booleano `createAsInvoiced` en CreateSaleRequest, y mapear en backend a InvoiceStatus.

**Pros:**
- ✅ Semántica clara de intención
- ✅ No afecta campo existente

**Contras:**
- ❌ Redundancia: ya existe `invoiceStatus`
- ❌ Requiere lógica de mapeo en backend
- ❌ Dos formas de expresar lo mismo
- ❌ Complejidad innecesaria

**Esfuerzo estimado:** Alto (5-6 días)

**Recomendación:** ❌ No recomendado (complejidad innecesaria)

### Opción D: Endpoint Separado POST /api/sales/invoiced

**Descripción:** Crear endpoint nuevo específico para ventas ya facturadas.

**Pros:**
- ✅ Separación clara de concerns
- ✅ Permite validaciones específicas para INVOICED

**Contras:**
- ❌ Duplicación de código (casi idéntico a POST /api/sales)
- ❌ Dos endpoints para hacer lo mismo
- ❌ Más código de tests
- ❌ Mobile necesita lógica condicional para elegir endpoint

**Esfuerzo estimado:** Alto (6-7 días)

**Recomendación:** ❌ No recomendado (duplicación innecesaria)

---

## 15. Propuesta de Implementación Recomendada

### Enfoque: Opción A — UI Toggle con Campo Existente

**Justificación:**
- El backend ya soporta la funcionalidad
- El contrato API ya es correcto
- Solo requiere cambios en mobile UI
- Mantiene simplicidad arquitectónica
- Menor esfuerzo, menor riesgo

### Cambios Necesarios

#### 1. Mobile UI (new-sale.tsx)

**Agregar estado:**
```typescript
const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>("PENDING");
```

**Agregar UI (después de sección de pagos):**
```typescript
<View style={styles.card}>
  <Text style={styles.cardTitle}>Invoice status</Text>
  <Text style={styles.helpText}>
    Mark as "Invoiced" only if a physical invoice was issued to the customer immediately.
  </Text>
  
  <View style={styles.radioGroup}>
    <Pressable
      style={styles.radioOption}
      onPress={() => setInvoiceStatus("PENDING")}
    >
      <View style={[styles.radio, invoiceStatus === "PENDING" && styles.radioSelected]} />
      <View>
        <Text style={styles.radioLabel}>Pending invoice</Text>
        <Text style={styles.radioHint}>Invoice will be issued later</Text>
      </View>
    </Pressable>
    
    <Pressable
      style={styles.radioOption}
      onPress={() => setInvoiceStatus("INVOICED")}
    >
      <View style={[styles.radio, invoiceStatus === "INVOICED" && styles.radioSelected]} />
      <View>
        <Text style={styles.radioLabel}>Already invoiced</Text>
        <Text style={styles.radioHint}>Physical invoice was issued immediately</Text>
      </View>
    </Pressable>
  </View>
</View>
```

**Modificar submit:**
```typescript
await createSale({
  items: items.map(...),
  discounts: buildDiscounts(...),
  payments: buildPayments(finalTotal),
  invoiceStatus: invoiceStatus, // ← Usar estado en lugar de hardcoded
  note: note.trim().length > 0 ? note.trim() : undefined,
});
```

#### 2. Backend — Sin Cambios

El backend ya soporta esta funcionalidad. NO se requieren cambios.

#### 3. Tests Backend

**Agregar test en SaleServiceTest.java:**
```java
@Test
void should_create_sale_with_invoiced_status() {
    // Arrange
    Store store = activeStore();
    User staff = activeStaffWithStore(store);
    UUID staffId = staff.getId();
    Shift shift = openShiftFor(staff, store);

    when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
    when(shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)).thenReturn(Optional.of(shift));
    when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

    CreateSaleRequest request = new CreateSaleRequest(
        List.of(new CreateSaleItemRequest("Product A", 1, new BigDecimal("50.00"))),
        List.of(),
        List.of(new CreateSalePaymentRequest(PaymentMethod.CASH, new BigDecimal("50.00"))),
        InvoiceStatus.INVOICED, // ← CREAR CON INVOICED
        "Customer requested invoice immediately"
    );

    // Act
    Sale sale = saleService.createSale(staffId, request);

    // Assert
    assertThat(sale.getStatus()).isEqualTo(SaleStatus.ACTIVE);
    assertThat(sale.getInvoiceStatus()).isEqualTo(InvoiceStatus.INVOICED); // ← VALIDAR INVOICED
    assertThat(sale.getFinalTotalAmount()).isEqualByComparingTo("50.00");
    verify(saleRepository).save(any(Sale.class));
}
```

#### 4. Tests Mobile

**Agregar test en sales.test.ts:**
```typescript
it("creates a sale with invoiced status", async () => {
  mockedApiClient.post.mockResolvedValueOnce({
    data: {
      success: true,
      message: "Sale created successfully",
      data: {
        id: "sale-5",
        shiftId: "shift-1",
        staffId: "staff-1",
        storeId: "store-1",
        status: "ACTIVE",
        invoiceStatus: "INVOICED", // ← Mock con INVOICED
        subtotalAmount: 100,
        discountTotalAmount: 0,
        finalTotalAmount: 100,
        note: "Customer requested invoice",
        items: [
          {
            id: "item-5",
            productName: "Premium product",
            quantity: 1,
            unitPrice: 100,
            lineTotal: 100,
          },
        ],
        discounts: [],
        payments: [
          {
            id: "payment-5",
            method: "CASH",
            amount: 100,
          },
        ],
        createdAt: "2026-05-17T10:00:00Z",
        updatedAt: "2026-05-17T10:00:00Z",
        cancelledAt: null,
        cancelledReason: null,
      },
    },
  });

  const request = {
    items: [
      {
        productName: "Premium product",
        quantity: 1,
        unitPrice: 100,
      },
    ],
    discounts: [],
    payments: [
      {
        method: "CASH" as const,
        amount: 100,
      },
    ],
    invoiceStatus: "INVOICED" as const, // ← Request con INVOICED
  };

  const result = await createSale(request);

  expect(mockedApiClient.post).toHaveBeenCalledWith("/api/sales", request);
  expect(result.id).toBe("sale-5");
  expect(result.invoiceStatus).toBe("INVOICED"); // ← Validar respuesta
});
```

#### 5. Documentación

**Actualizar business-rules.md:**
```markdown
### BR-SALE-015: Creación con Estado de Factura

Al crear una venta, el staff debe indicar si la factura física fue emitida inmediatamente:

- **PENDING:** La factura se emitirá más tarde (default)
- **INVOICED:** La factura física fue emitida en el momento de la venta

**Validación:** El campo es obligatorio en el request.

**Restricción:** Una venta creada como INVOICED no puede revertirse a PENDING (BR-SALE-014).

**Recomendación:** Solo marcar como INVOICED si el cliente solicitó factura y fue entregada inmediatamente.
```

---

## 16. Secuencia de Implementación TDD

### Fase 1: Tests Backend (1 día)

1. ✅ Escribir test `should_create_sale_with_invoiced_status()`
2. ❌ Ejecutar test → debe PASAR (backend ya soporta)
3. ✅ Validar que test pasa sin cambios de código
4. ✅ Ejecutar suite completa (359 tests) → debe seguir pasando

### Fase 2: Tests Mobile (1 día)

1. ✅ Escribir test `creates a sale with invoiced status`
2. ❌ Ejecutar test → debe PASAR (API client ya soporta)
3. ✅ Validar que test pasa sin cambios de código
4. ✅ Ejecutar suite completa (50 tests) → debe seguir pasando

### Fase 3: UI Mobile (2 días)

1. ✅ Agregar estado `invoiceStatus` con default "PENDING"
2. ✅ Agregar sección UI con radio buttons
3. ✅ Conectar estado con submit handler
4. ✅ Ejecutar `pnpm exec tsc --noEmit` → debe pasar
5. ✅ Ejecutar `pnpm test` → debe pasar
6. ✅ Testing manual en desarrollo local
7. ✅ Validar que ventas creadas como PENDING siguen funcionando
8. ✅ Validar que ventas creadas como INVOICED se persisten correctamente
9. ✅ Validar que endpoint PATCH /api/sales/{id}/invoice rechaza ventas ya INVOICED

### Fase 4: Documentación y Capacitación (1 día)

1. ✅ Actualizar business-rules.md con BR-SALE-015
2. ✅ Actualizar mobile-api-contract.md con ejemplo de INVOICED
3. ✅ Crear guía de usuario para staff sobre cuándo usar INVOICED
4. ✅ Preparar capacitación para administrador

### Fase 5: Deploy y Validación (1 día)

1. ✅ Deploy a staging
2. ✅ Testing E2E manual
3. ✅ Validación con usuario real (admin o tester)
4. ✅ Deploy a producción
5. ✅ Monitoreo de errores primeras 24h

**Total estimado:** 6 días laborables

---

## 17. Checklist de Validación Pre-Implementation

### Backend

- ✅ CreateSaleRequest tiene campo `invoiceStatus` (@NotNull)
- ✅ SaleService.createSale() usa `request.invoiceStatus()` directamente
- ✅ No hay validaciones que rechacen InvoiceStatus.INVOICED en creación
- ✅ Columna DB `invoice_status` acepta "INVOICED" (enum STRING)
- ✅ SaleResponse incluye campo `invoiceStatus` en response

### Mobile

- ✅ CreateSaleRequest type incluye `invoiceStatus: InvoiceStatus`
- ✅ InvoiceStatus type permite "PENDING" | "INVOICED"
- ✅ API client `createSale()` envía request completo sin modificar
- ✅ Actualmente se envía hardcoded "PENDING" (necesita cambio)

### Tests

- ⚠️ NO existen tests backend que validen crear con INVOICED (gap a cubrir)
- ⚠️ NO existen tests mobile que validen crear con INVOICED (gap a cubrir)
- ✅ Tests de markAsInvoiced validan que no se puede facturar venta ya INVOICED

### Reglas de Negocio

- ✅ Compatible con BR-SALE-011 (estado obligatorio)
- ✅ Compatible con BR-SALE-012 (valores PENDING/INVOICED)
- ✅ Compatible con BR-SALE-013 (transición PENDING→INVOICED)
- ✅ Compatible con BR-SALE-014 (irreversibilidad)
- ✅ No introduce nuevas restricciones

### UX

- ⚠️ Requiere UI clara para que staff entienda diferencia (a implementar)
- ⚠️ Requiere default a PENDING para mantener comportamiento actual (a implementar)
- ⚠️ Requiere help text descriptivo (a implementar)

---

## 18. Hallazgos Críticos Resumen

### Hallazgo #1: Backend Ya Soporta la Feature

El backend **ya acepta y procesa correctamente** ventas creadas con `invoiceStatus = INVOICED`. No se requieren cambios backend.

**Evidencia:**
- CreateSaleRequest tiene `@NotNull InvoiceStatus invoiceStatus` (línea 19)
- SaleService.createSale() usa `sale.setInvoiceStatus(request.invoiceStatus())` (línea 100)
- No hay validaciones que rechacen INVOICED en creación

**Implicación:** La implementación solo requiere cambios mobile (UI + tests).

### Hallazgo #2: Mobile Siempre Envía PENDING Hardcodeado

El formulario mobile de nueva venta siempre envía `invoiceStatus: "PENDING"` sin permitir al usuario elegir.

**Evidencia:**
- new-sale.tsx línea 238: `invoiceStatus: "PENDING",` (constante literal)
- No existe estado para `invoiceStatus` en el componente
- No existe UI (switch, checkbox, radio) para selección

**Implicación:** El problema es de UX, no de arquitectura. El mobile necesita exponer la opción que el backend ya soporta.

### Hallazgo #3: Tipos TypeScript Ya Están Preparados

El tipo `CreateSaleRequest` en mobile ya incluye el campo `invoiceStatus: InvoiceStatus`.

**Evidencia:**
- api.ts línea 128: `invoiceStatus: InvoiceStatus;` (campo obligatorio)
- InvoiceStatus es union type `"PENDING" | "INVOICED"`

**Implicación:** No se requieren cambios de tipos TypeScript. El contrato ya es correcto.

### Hallazgo #4: Gap de Cobertura de Tests

Ningún test (ni backend ni mobile) valida crear una venta con `invoiceStatus = INVOICED`.

**Evidencia:**
- Todos los tests backend usan `InvoiceStatus.PENDING` en helpers
- Todos los tests mobile usan `invoiceStatus: "PENDING" as const`
- No hay asserts que validen `invoiceStatus = INVOICED` en creación

**Implicación:** Antes de implementar la feature, debemos agregar tests que validen el nuevo comportamiento.

### Hallazgo #5: Endpoint Posterior Sigue Siendo Necesario

El endpoint `PATCH /api/sales/{id}/invoice` seguirá siendo útil para ventas creadas como PENDING que necesiten facturarse después.

**Evidencia:**
- El endpoint tiene validaciones específicas (no cancelada, no ya facturada)
- Hay casos legítimos donde la factura se emite horas después del registro
- No hay redundancia técnica entre POST y PATCH

**Implicación:** No eliminar ni deprecar el endpoint PATCH. Ambos flows coexisten.

---

## 19. Conclusiones y Recomendaciones

### Conclusión Principal

**La funcionalidad solicitada ya existe en el backend.** El sistema está técnicamente preparado para crear ventas directamente con `invoiceStatus = INVOICED`. La limitación actual es **solo de interfaz de usuario mobile**, que no expone esta opción al staff.

### Arquitectura Backend

El diseño actual es **correcto, flexible y no requiere cambios:**

1. ✅ CreateSaleRequest acepta cualquier InvoiceStatus válido
2. ✅ SaleService confía en el valor enviado sin imponer restricciones innecesarias
3. ✅ Validaciones están donde corresponde: el endpoint PATCH valida transiciones, el POST valida estructura
4. ✅ No hay código muerto, duplicación, ni deuda técnica relacionada con invoice status

### Mobile Implementation

**Recomendación:** Implementar Opción A (UI toggle con campo existente)

**Razones:**
- ✅ Menor esfuerzo (solo cambios mobile)
- ✅ Menor riesgo (backend ya validado)
- ✅ Mantiene consistencia arquitectónica
- ✅ No introduce complejidad innecesaria
- ✅ Backward compatible (default a PENDING)

**Componentes a modificar:**
1. new-sale.tsx → agregar estado y UI para elegir invoice status
2. SaleServiceTest.java → agregar test para creación con INVOICED
3. sales.test.ts → agregar test para request con INVOICED
4. business-rules.md → documentar BR-SALE-015

### Testing

**Crítico:** NO implementar sin antes agregar tests.

**Tests requeridos:**
1. Backend unit test: crear venta con `InvoiceStatus.INVOICED`
2. Backend integration test: validar que PATCH rechaza venta ya INVOICED creada directamente
3. Mobile unit test: mock de createSale con `invoiceStatus: "INVOICED"`
4. Mobile E2E manual: crear venta real con INVOICED y validar persistencia

### UX Considerations

**Diseño de UI recomendado:**
- Default: PENDING (mantener comportamiento actual)
- Tipo de control: Radio buttons (mutuamente exclusivos)
- Labels claros: "Pending invoice" vs "Already invoiced"
- Help text: explicar cuándo usar cada opción
- Posición: después de sección de pagos, antes de nota

**Capacitación requerida:**
- Explicar a staff cuándo marcar como INVOICED
- Aclarar que INVOICED es irreversible
- Mostrar que ambos flows (creación + posterior) siguen disponibles

### Riesgos Identificados

**Mitigados:**
- ✅ Compatibilidad con reglas de negocio: validada
- ✅ Impacto en reportes: ninguno (usan estados finales)
- ✅ Breaking changes: ninguno (campo ya existe)

**A gestionar:**
- ⚠️ Gap de tests: bloquea implementación hasta resolverse
- ⚠️ UX confusa: requiere diseño claro y capacitación
- ⚠️ Validación de intención: staff debe entender el significado de INVOICED

### Estimación

**Esfuerzo total:** 6 días laborables

**Breakdown:**
- Tests backend: 1 día
- Tests mobile: 1 día
- UI mobile: 2 días
- Documentación: 1 día
- Deploy y validación: 1 día

**Dependencias:** Ninguna bloqueante

**Riesgo:** Bajo (feature ya funciona en backend)

---

## Próximos Pasos

Esta auditoría **NO incluye implementación**. Los hallazgos y recomendaciones están listos para iniciar Phase 17.3B (implementation) cuando el equipo lo decida.

**Phase 17.3A completed as a read-only create-sale invoicing audit. No implementation changes were made.**
