ALTER TABLE punter_settings
    ADD COLUMN pref_announcements           BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN pref_auto_accept_better_odds BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN pref_promotions              BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN pref_sign_in_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN pref_subscription_updates    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN keycloak_migration_version   INTEGER NOT NULL DEFAULT 0;