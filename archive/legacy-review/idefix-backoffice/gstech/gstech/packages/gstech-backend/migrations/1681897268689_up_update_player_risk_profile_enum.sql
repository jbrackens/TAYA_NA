CREATE TYPE player_risk_profile_tmp AS ENUM ('low', 'medium', 'high');

UPDATE "players"
SET "riskProfile" = 'medium'
WHERE "riskProfile" = 'medium_low';

UPDATE "players"
SET "riskProfile" = 'high'
WHERE "riskProfile" = 'medium_high';

ALTER TABLE "players"
ALTER COLUMN "riskProfile"
SET DEFAULT NULL;

ALTER TABLE "risks"
ALTER COLUMN "riskProfiles" TYPE player_risk_profile_tmp[] USING "riskProfiles"::text[]::player_risk_profile_tmp[];

ALTER TABLE "players"
ALTER COLUMN "riskProfile" TYPE player_risk_profile_tmp USING "riskProfile"::text::player_risk_profile_tmp;

DROP TYPE player_risk_profile;

ALTER TYPE player_risk_profile_tmp
RENAME TO player_risk_profile;

ALTER TABLE "players"
ALTER COLUMN "riskProfile"
SET DEFAULT 'low'::player_risk_profile;