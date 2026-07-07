ALTER TABLE incidents
ADD COLUMN source VARCHAR(30);

UPDATE incidents
SET source = 'MANUAL'
WHERE source IS NULL;

ALTER TABLE incidents
ALTER COLUMN source SET NOT NULL;

ALTER TABLE incidents
ADD CONSTRAINT incidents_source_check
CHECK (source IN ('MANUAL', 'AUTOMATIC_CLOSURE'));

CREATE UNIQUE INDEX ux_incidents_automatic_closure_type
ON incidents (closure_id, type)
WHERE source = 'AUTOMATIC_CLOSURE';