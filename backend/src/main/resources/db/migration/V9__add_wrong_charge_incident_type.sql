ALTER TABLE incidents
DROP CONSTRAINT incidents_type_check;

ALTER TABLE incidents
ADD CONSTRAINT incidents_type_check CHECK (
    type IN (
        'CASH_DIFFERENCE',
        'MB_DIFFERENCE',
        'GLOVO_ISSUE',
        'WRONG_CHARGE',
        'PENDING_INVOICE',
        'SALE_CANCELLATION',
        'OPERATIONAL_NOTE',
        'OTHER'
    )
);