ALTER TABLE punter_registration_data
    ADD COLUMN updated_at timestamptz;

UPDATE punter_registration_data SET updated_at = now();

ALTER TABLE punter_registration_data
    ALTER COLUMN updated_at SET NOT NULL;
