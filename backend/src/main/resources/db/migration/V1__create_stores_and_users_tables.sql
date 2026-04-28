CREATE TABLE stores (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    address VARCHAR(255) NOT NULL,
    base_cash_amount NUMERIC(10, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(160) UNIQUE,
    pin_hash VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(30) NOT NULL,
    store_id UUID REFERENCES stores(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT users_role_check CHECK (role IN ('STAFF', 'ADMIN')),
    CONSTRAINT users_staff_store_required CHECK (
        role <> 'STAFF' OR store_id IS NOT NULL
    ),
    CONSTRAINT users_admin_store_null CHECK (
        role <> 'ADMIN' OR store_id IS NULL
    ),
    CONSTRAINT users_staff_pin_required CHECK (
        role <> 'STAFF' OR pin_hash IS NOT NULL
    ),
    CONSTRAINT users_admin_password_required CHECK (
        role <> 'ADMIN' OR password_hash IS NOT NULL
    )
);