CREATE TYPE country_risk_profile_tmp AS ENUM ('low', 'medium', 'high');

ALTER TABLE countries
ALTER COLUMN "riskProfile"
SET DEFAULT NULL;

ALTER TABLE countries
ALTER COLUMN "riskProfile" TYPE country_risk_profile_tmp USING "riskProfile"::text::country_risk_profile_tmp;

DROP TYPE country_risk_profile;

ALTER TYPE country_risk_profile_tmp
RENAME TO country_risk_profile;

ALTER TABLE countries
ALTER COLUMN "riskProfile"
SET DEFAULT 'low'::country_risk_profile;
