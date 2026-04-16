ALTER TABLE punter_settings
    ADD COLUMN sign_up_date             TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN is_registration_verified BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN is_account_verified      BOOLEAN     NOT NULL DEFAULT false;