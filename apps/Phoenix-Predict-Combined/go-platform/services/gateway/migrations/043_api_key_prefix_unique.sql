-- 043: enforce unique alpha/bot API-key prefixes (SECURITY-REVIEW #21).
--
-- GetAPIKeyByPrefix does a QueryRow on key_prefix, which had only a non-unique
-- partial index — so a (improbable but possible) prefix collision could make the
-- lookup bcrypt-compare a presented secret against the WRONG key row's hash. A
-- unique index makes the 4-byte prefix an unambiguous lookup key.
--
-- +goose Up
DROP INDEX IF EXISTS idx_pred_api_keys_prefix;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pred_api_keys_prefix ON prediction_api_keys(key_prefix);

-- +goose Down
DROP INDEX IF EXISTS idx_pred_api_keys_prefix;
CREATE INDEX idx_pred_api_keys_prefix ON prediction_api_keys(key_prefix) WHERE active = true;
