ALTER TABLE incidents
ADD CONSTRAINT incidents_automatic_closure_context_check
CHECK (
    source <> 'AUTOMATIC_CLOSURE'
    OR (
        shift_id IS NOT NULL
        AND closure_id IS NOT NULL
        AND sale_id IS NULL
        AND type IN ('CASH_DIFFERENCE', 'MB_DIFFERENCE')
    )
);