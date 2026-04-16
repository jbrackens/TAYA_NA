CREATE TABLE punter_settings (
    punter_id character varying NOT NULL PRIMARY KEY,
    last_sign_in_timestamp timestamptz NULL,
    last_sign_in_ip CHARACTER VARYING NULL,
    migrated_keycloak_db_set1 BOOLEAN NOT NULL default false,
    CONSTRAINT fk_punter_id
        FOREIGN KEY (punter_id) REFERENCES punter_registration_data(punter_id) ON DELETE CASCADE
);

ALTER TABLE punter_personal_details
    ADD COLUMN is_phone_number_verified BOOLEAN NOT NULL DEFAULT false;
