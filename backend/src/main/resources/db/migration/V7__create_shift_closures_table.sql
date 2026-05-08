CREATE TABLE shift_closures (
    id UUID PRIMARY KEY,
    shift_id UUID NOT NULL UNIQUE REFERENCES shifts(id),
    closed_by UUID NOT NULL REFERENCES users(id),

    total_cash NUMERIC(10, 2) NOT NULL,
    total_mb NUMERIC(10, 2) NOT NULL,
    total_glovo_online NUMERIC(10, 2) NOT NULL,
    total_glovo_cash NUMERIC(10, 2) NOT NULL,
    total_sales NUMERIC(10, 2) NOT NULL,
    pending_invoice_total NUMERIC(10, 2) NOT NULL,

    cash_to_withdraw NUMERIC(10, 2) NOT NULL,
    expected_physical_cash NUMERIC(10, 2) NOT NULL,

    confirmed_cash_amount NUMERIC(10, 2) NOT NULL,
    confirmed_mb_amount NUMERIC(10, 2) NOT NULL,

    cash_difference NUMERIC(10, 2) NOT NULL,
    mb_difference NUMERIC(10, 2) NOT NULL,

    status VARCHAR(50) NOT NULL,
    note VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT shift_closures_status_check CHECK (status IN ('CLOSED_OK', 'CLOSED_WITH_INCIDENT'))
);