# M10.2 — Análisis de Split Payments

**Archivos inspeccionados:**
- `sales/model/PaymentMethod.java`
- `sales/model/SalePayment.java`
- `sales/dto/CreateSaleRequest.java`
- `sales/dto/CreateSalePaymentRequest.java`
- `sales/dto/SalePaymentResponse.java`
- `sales/dto/SaleResponse.java`
- `sales/service/SaleService.java`
- `sales/controller/SaleController.java`
- `shifts/service/ShiftService.java`
- `db/migration/V6__create_sales_tables.sql`
- `SaleServiceTest.java`
- `SaleFlowIntegrationTest.java`
- `docs/mobile-api-contract.md`
- `docs/business-rules.md`

---

## 1. Payment Methods

**Exactamente 4 valores, confirmados al 100%:**

| Valor | Afecta caja física |
|---|---|
| `CASH` | Sí |
| `MB` (tarjeta/terminal) | No |
| `GLOVO_ONLINE` | No |
| `GLOVO_CASH` | Sí |

El TypeScript de mobile ya es correcto: `src/types/api.ts` tiene `type PaymentMethod = "CASH" | "MB" | "GLOVO_ONLINE" | "GLOVO_CASH"`. La restricción DB `CHECK` también lo valida a nivel de base de datos.

---

## 2. Forma exacta del request — `payments[]`

```ts
// CreateSalePaymentRequest
{
  method: PaymentMethod,  // @NotNull — requerido
  amount: BigDecimal      // @NotNull @Positive — requerido, DEBE ser > 0
}
```

- `payments` en el request tiene `@NotEmpty` → **no puede ser null ni lista vacía.**
- `discounts` es opcional y puede ser null o `[]`.
- No hay campos opcionales en cada payment.

---

## 3. Reglas de Split Payment

**✅ Múltiples pagos permitidos.** El servicio itera sobre `request.payments()` sin ningún límite de cantidad.

**✅ Métodos diferentes combinables.** No hay restricción en el servicio que prohíba combinaciones.

**⚠️ Mismo método dos veces → BUG de superficie.**
No hay validación a nivel de servicio. Si mobile envía `CASH` dos veces, el servicio intenta persistir ambos, y el servidor PostgreSQL lanza un `ConstraintViolationException` por la constraint:

```sql
-- V6__create_sales_tables.sql, línea 68
CONSTRAINT sale_payments_unique_method_per_sale UNIQUE (sale_id, method)
```

Esto sale como **HTTP 500** (no manejado), no como 400 con mensaje limpio. **Es un gap del backend**, aunque mobile debe prevenirlo por diseño de UI. Se detalla al final.

---

## 4. Validación del total de pagos

En `SaleService.createSale()`:

```java
private BigDecimal calculatePaymentTotal(List<CreateSalePaymentRequest> payments) {
    return payments.stream()
            .map(payment -> toMoney(payment.amount()))  // normaliza a scale 2
            .reduce(ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
}

// Luego:
if (paymentTotal.compareTo(finalTotal) != 0) {
    throw new BusinessException("Payment total must match sale final total");
}
```

- Comparación por **valor semántico** (`compareTo`), no por escala. `20.00` == `20.0` == `20`.
- Cada amount individual se normaliza con `toMoney()` (scale 2, HALF_UP) antes de sumar.
- Si suma < finalTotal → `400 Payment total must match sale final total`
- Si suma > finalTotal → mismo error → `400`
- **No hay redondeo implícito del total de pagos** más allá de la normalización individual. Mobile debe garantizar que `sum === finalTotal` exactamente.

---

## 5. Interacción con Descuentos

Con descuentos: `finalTotal = subtotal - discountTotal`. Los pagos deben sumar exactamente ese `finalTotal`.

El código es el mismo para 1 o N pagos. El servicio calcula `finalTotal` primero, luego suma payments, luego compara. No hay rama separada para split.

**Tests combinados descuento + split payment: NINGUNO.** Todos los tests de descuentos usan un solo pago. Sin embargo, el código path es seguro — no hay dependencia entre la lógica de descuentos y la lógica de pagos.

---

## 6. Close Shift y Reports — Impacto correcto

En `ShiftService.calculateShiftTotals()`:

```java
private BigDecimal totalByPaymentMethod(List<Sale> sales, PaymentMethod method) {
    return sales.stream()
            .flatMap(sale -> sale.getPayments().stream())  // ← itera TODOS los payments
            .filter(payment -> payment.getMethod() == method)
            .map(SalePayment::getAmount)
            .reduce(ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
}
```

Los split payments **funcionan perfectamente** en el close:

- Venta con CASH=15.00 + MB=10.00 → `totalCash += 15`, `totalMb += 10`
- `totalSales` usa `sale.getFinalTotalAmount()` → no depende de payments
- **Invariante garantizada:** `totalCash + totalMb + totalGlovoOnline + totalGlovoCash = totalSales` (porque el servicio exige que sum(payments) = finalTotal en cada venta)
- Este mismo método es usado por close preview, close result, y en upstream por daily/weekly/monthly reports

---

## 7. Response DTO — `payments[]`

```json
"payments": [
  {
    "id": "3a4b5c6d-...",
    "method": "CASH",
    "amount": 15.00
  },
  {
    "id": "7e8f9a0b-...",
    "method": "MB",
    "amount": 10.00
  }
]
```

Campos: `id` (UUID), `method` (string), `amount` (decimal). **No hay `createdAt`** en `SalePaymentResponse`. Múltiples payments se preservan íntegramente.

---

## 8. Cobertura de Tests Existente

| Escenario | Test existente | Archivo |
|---|---|---|
| Pago único CASH | ✅ `should_create_sale_without_discounts_when_payment_matches_total` | `SaleServiceTest` |
| Pago único MB | ✅ `should_create_sale_with_voucher_10_percent_discount` | `SaleServiceTest` |
| Total de pago != finalTotal | ✅ `should_throw_when_payment_total_does_not_match_final_total` | `SaleServiceTest` |
| Pago único + discount | ✅ `should_create_sale_with_loyalty_card_discount_when_subtotal_is_at_least_25`, `should_create_sale_with_manual_discount_fixed_amount`, `should_create_sale_combining_loyalty_card_and_manual_discount` | `SaleServiceTest` |
| Pago único CASH (HTTP) | ✅ `should_create_sale_as_staff_with_cash_payment` | `SaleFlowIntegrationTest` |
| Pago único + discount manual (HTTP) | ✅ `should_create_sale_with_manual_discount` | `SaleFlowIntegrationTest` |
| **Split payment (múltiples métodos)** | ❌ No existe | — |
| **Método duplicado** | ❌ No existe | — |
| **Discount + split payment** | ❌ No existe | — |
| `payments = []` | ❌ No existe (cubierto por `@NotEmpty` DTO validation) | — |
| `amount <= 0` | ❌ No existe (cubierto por `@Positive` DTO validation) | — |

---

## 9. Bug Identificado — Método Duplicado sin Manejo

El servicio no valida duplicados antes de persistir. Si mobile envía `[{CASH, 10}, {CASH, 10}]`:

1. El servicio suma correctamente → `paymentTotal = 20.00`
2. Si `finalTotal = 20.00` → pasa la validación
3. Se intenta `saleRepository.save(sale)` con dos `SalePayment` con mismo `(sale_id, method)`
4. PostgreSQL lanza `ConstraintViolationException`
5. El `GlobalExceptionHandler` no tiene handler específico para esto → **HTTP 500**

**Recomendación:** Agregar validación en el servicio antes del `save()`, pero como el usuario indicó "explain first", se deja documentado para decidir si vale añadirlo a M10.2 o separarlo como hotfix.

---

## 10. Ejemplos JSON

### 1. Pago único
```json
{
  "items": [{ "productName": "Coffee", "quantity": 2, "unitPrice": 10.00 }],
  "discounts": [],
  "payments": [
    { "method": "CASH", "amount": 20.00 }
  ],
  "invoiceStatus": "PENDING"
}
```

### 2. Split CASH + MB
```json
{
  "items": [{ "productName": "Coffee", "quantity": 3, "unitPrice": 10.00 }],
  "discounts": [],
  "payments": [
    { "method": "CASH", "amount": 15.00 },
    { "method": "MB",   "amount": 15.00 }
  ],
  "invoiceStatus": "PENDING"
}
```
subtotal 30.00 = 15.00 + 15.00 ✓

### 3. Split CASH + GLOVO_CASH
```json
{
  "items": [{ "productName": "Burger", "quantity": 1, "unitPrice": 12.50 }],
  "discounts": [],
  "payments": [
    { "method": "CASH",       "amount": 7.50 },
    { "method": "GLOVO_CASH", "amount": 5.00 }
  ],
  "invoiceStatus": "PENDING"
}
```
subtotal 12.50 = 7.50 + 5.00 ✓

### 4. Split con Descuento
```json
{
  "items": [
    { "productName": "Coffee",    "quantity": 2, "unitPrice": 10.00 },
    { "productName": "Croissant", "quantity": 1, "unitPrice": 10.00 }
  ],
  "discounts": [{ "reason": "MANUAL_DISCOUNT", "amount": 5.00, "note": "Manager approved" }],
  "payments": [
    { "method": "CASH", "amount": 15.00 },
    { "method": "MB",   "amount": 10.00 }
  ],
  "invoiceStatus": "PENDING"
}
```
subtotal 30.00 − 5.00 = finalTotal 25.00 = 15.00 + 10.00 ✓

---

## 11. Recomendación de Implementación Mobile — M10.2

### Modo único vs. modo split

Implementar **dos modos con toggle**:

- **"Single payment"**: selector de método + campo amount pre-relleno con `localFinalTotal`. Simple, default.
- **"Split payment"**: muestra los 4 métodos como filas con input de amount. El usuario introduce cuánto paga con cada método (puede dejar 0.00 en los que no usa).

### Reglas de validación en mobile (client-side, antes de enviar)

1. **Calcular `localFinalTotal`** = `sum(items[].quantity * unitPrice) - sum(discounts[].amountApplied)`. Mostrar como "Total: X.XX EUR" en la UI.
2. **Solo enviar payments con `amount > 0`**. Filtrar antes de construir el request.
3. **Validar `sum(sentPayments[].amount) === localFinalTotal`** exactamente antes de enviar. Mostrar "Remaining: X.XX" en tiempo real.
4. **Prevenir métodos duplicados por diseño**: en modo split, cada método es un campo fijo de la UI, no una lista addable. Un método no puede aparecer dos veces estructuralmente. Esto evita el bug 500 del backend.
5. **Redondear amounts con 2 decimales** en el cálculo local (usando lógica equivalente a `setScale(2, HALF_UP)` — en JS: `Math.round(x * 100) / 100`).

### Combinación GLOVO_ONLINE con otros

**Negocio:** GLOVO_ONLINE es un pedido de Glovo cobrado online — Glovo paga directamente al restaurante, el cliente no interactúa con la caja. No tiene sentido lógico combinar GLOVO_ONLINE con CASH, MB o GLOVO_CASH en una misma venta.

**El backend lo permite técnicamente** (no hay restricción). Recomendación: **no permitirlo en mobile**. Cuando se selecciona GLOVO_ONLINE, desactivar los otros tres métodos, y viceversa. Esto es una restricción de negocio a nivel de UI, no a nivel de backend.

### Resumen de decisiones para M10.2

| Decisión | Recomendación |
|---|---|
| Modo único + split | Sí, con toggle |
| Split: campos fijos por método | Sí (no lista dinámica) |
| Filtrar amounts = 0 antes de enviar | Sí |
| Validar suma == finalTotal en cliente | Sí, con feedback en tiempo real |
| Prevenir métodos duplicados | Por diseño de UI (no es necesario validación extra) |
| GLOVO_ONLINE combinable | No — desactivar los demás cuando se selecciona |
| GLOVO_CASH combinable con CASH/MB | Sí, técnica y comercialmente válido |
