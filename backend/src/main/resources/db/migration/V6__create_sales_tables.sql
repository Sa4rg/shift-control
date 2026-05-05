CREATE TABLE sales (
    id UUID PRIMARY KEY,
    shift_id UUID NOT NULL REFERENCES shifts(id),
    staff_id UUID NOT NULL REFERENCES users(id),
    store_id UUID NOT NULL REFERENCES stores(id),

    status VARCHAR(30) NOT NULL,
    invoice_status VARCHAR(30) NOT NULL,

    subtotal_amount NUMERIC(10, 2) NOT NULL,
    discount_total_amount NUMERIC(10, 2) NOT NULL,
    final_total_amount NUMERIC(10, 2) NOT NULL,

    note VARCHAR(500),
    cancelled_reason VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT sales_status_check CHECK (status IN ('ACTIVE', 'CANCELLED')),
    CONSTRAINT sales_invoice_status_check CHECK (invoice_status IN ('PENDING', 'INVOICED')),
    CONSTRAINT sales_subtotal_non_negative CHECK (subtotal_amount >= 0),
    CONSTRAINT sales_discount_total_non_negative CHECK (discount_total_amount >= 0),
    CONSTRAINT sales_final_total_positive CHECK (final_total_amount > 0)
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,

    product_name VARCHAR(160) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    line_total NUMERIC(10, 2) NOT NULL,

    CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT sale_items_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT sale_items_line_total_positive CHECK (line_total > 0)
);

CREATE TABLE sale_discounts (
    id UUID PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,

    type VARCHAR(30) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    amount_applied NUMERIC(10, 2) NOT NULL,
    note VARCHAR(500),

    CONSTRAINT sale_discounts_type_check CHECK (type IN ('FIXED_AMOUNT', 'PERCENTAGE')),
    CONSTRAINT sale_discounts_reason_check CHECK (reason IN ('MANUAL_DISCOUNT', 'LOYALTY_CARD', 'VOUCHER_10_PERCENT')),
    CONSTRAINT sale_discounts_value_positive CHECK (value > 0),
    CONSTRAINT sale_discounts_amount_applied_positive CHECK (amount_applied > 0)
);

CREATE TABLE sale_payments (
    id UUID PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,

    method VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,

    CONSTRAINT sale_payments_method_check CHECK (method IN ('CASH', 'MB', 'GLOVO_ONLINE', 'GLOVO_CASH')),
    CONSTRAINT sale_payments_amount_positive CHECK (amount > 0),

    CONSTRAINT sale_payments_unique_method_per_sale UNIQUE (sale_id, method)
);