CREATE TABLE incidents (
    id UUID PRIMARY KEY,

    shift_id UUID REFERENCES shifts(id),
    closure_id UUID REFERENCES shift_closures(id),
    sale_id UUID REFERENCES sales(id),

    reported_by UUID NOT NULL REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),

    type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    severity VARCHAR(30) NOT NULL,

    title VARCHAR(160) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    resolution_note VARCHAR(1000),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT incidents_type_check CHECK (
        type IN (
            'CASH_DIFFERENCE',
            'MB_DIFFERENCE',
            'GLOVO_ISSUE',
            'PENDING_INVOICE',
            'SALE_CANCELLATION',
            'OPERATIONAL_NOTE',
            'OTHER'
        )
    ),

    CONSTRAINT incidents_status_check CHECK (
        status IN ('OPEN', 'RESOLVED')
    ),

    CONSTRAINT incidents_severity_check CHECK (
        severity IN ('LOW', 'MEDIUM', 'HIGH')
    )
);