ALTER TABLE punter_settings
    ADD COLUMN terms_accepted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN terms_accepted_version INT         NOT NULL DEFAULT 0;