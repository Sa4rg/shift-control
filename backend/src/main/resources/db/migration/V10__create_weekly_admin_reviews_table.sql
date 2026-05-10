CREATE TABLE weekly_admin_reviews (
    id UUID PRIMARY KEY,

    store_id UUID NOT NULL REFERENCES stores(id),
    staff_id UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID NOT NULL REFERENCES users(id),

    week_start DATE NOT NULL,
    week_end DATE NOT NULL,

    total_cash NUMERIC(10, 2) NOT NULL,
    total_mb NUMERIC(10, 2) NOT NULL,
    total_glovo_online NUMERIC(10, 2) NOT NULL,
    total_glovo_cash NUMERIC(10, 2) NOT NULL,
    total_sales NUMERIC(10, 2) NOT NULL,
    pending_invoice_total NUMERIC(10, 2) NOT NULL,

    cash_difference_total NUMERIC(10, 2) NOT NULL,
    mb_difference_total NUMERIC(10, 2) NOT NULL,

    closures_count INTEGER NOT NULL,
    incident_count INTEGER NOT NULL,

    status VARCHAR(50) NOT NULL,
    note VARCHAR(1000),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT weekly_admin_reviews_status_check CHECK (
        status IN ('REVIEWED_OK', 'REVIEWED_WITH_INCIDENT')
    ),

    CONSTRAINT weekly_admin_reviews_closures_count_non_negative CHECK (closures_count >= 0),
    CONSTRAINT weekly_admin_reviews_incident_count_non_negative CHECK (incident_count >= 0),

    CONSTRAINT weekly_admin_reviews_unique_staff_week UNIQUE (store_id, staff_id, week_start)
);