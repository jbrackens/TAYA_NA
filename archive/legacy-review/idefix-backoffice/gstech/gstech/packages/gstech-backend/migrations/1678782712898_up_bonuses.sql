ALTER TABLE "bonuses" ADD COLUMN "pnp" BOOLEAN DEFAULT FALSE;

WITH new_bonus AS (
  INSERT INTO bonuses (name, description, "brandId", active, "depositBonus", "depositCount", "depositCountMatch", "wageringRequirementMultiplier", "daysUntilExpiration", "depositMatchPercentage", "creditOnce", archived, "pnp")
  VALUES ('FK_DEPOSIT_PNP', 'PnP Deposit Bonus', 'FK', true, true, 0, false, 60, 7, 100, true, false, true)
  RETURNING id
)
INSERT INTO bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount")
SELECT
  new_bonus.id,
  currency.*
FROM
  new_bonus,
  (VALUES
    ('EUR', 100, 10000)
  ) AS currency("currencyId", "minAmount", "maxAmount");
