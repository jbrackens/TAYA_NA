ALTER TABLE reporting_punters
ADD COLUMN suspension_reason VARCHAR,
ADD COLUMN verified_at timestamptz,
ADD COLUMN verified_by varchar;
