--CREATE TABLE
CREATE TABLE user_account_mapping (
    oidc_sub    VARCHAR(255) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    partner_id  VARCHAR(255) NOT NULL
);

ALTER TABLE user_account_mapping
    ADD CONSTRAINT uq_user_account_mapping_oidc_sub_partner_id UNIQUE (oidc_sub, partner_id);


-- FILL DATA
INSERT INTO user_account_mapping (oidc_sub, external_id, partner_id)
SELECT oidc_sub, external_id, partner_id
FROM users;


-- columns not required - TO BE REMOVED
ALTER TABLE users
    ALTER COLUMN external_id DROP NOT NULL;
ALTER TABLE users
    ALTER COLUMN partner_id DROP NOT NULL;