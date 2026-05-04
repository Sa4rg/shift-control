CREATE TABLE shifts (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES users(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT shifts_type_check CHECK (type IN ('DAY', 'NIGHT')),
    CONSTRAINT shifts_status_check CHECK (status IN ('OPEN', 'CLOSED'))
);