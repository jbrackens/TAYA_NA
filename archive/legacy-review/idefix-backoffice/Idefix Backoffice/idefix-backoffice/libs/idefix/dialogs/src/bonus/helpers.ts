import set from "lodash/set";
import pick from "lodash/fp/pick";

import { Bonus, BonusLimit, CreateBonusValues } from "@idefix-backoffice/idefix/types";

const transformError = (err: any) => {
  const keys = err.errors ? Object.keys(err.errors) : [];
  const newError = { ...err, errors: {} };

  keys.length &&
    keys.forEach(key => {
      if (key.indexOf(".") > -1) {
        const index = key.split(".")[0];
        const field = key.split(".")[1];

        set(newError.errors, `limits[${index}].${field}`, err.errors[key]);
      } else {
        newError.errors[key] = err.errors[key];
      }
    });
};

const getBonusValues = (bonus: Bonus, limits: BonusLimit[]) =>
  ({
    ...pick(
      [
        "active",
        "name",
        "wageringRequirementMultiplier",
        "daysUntilExpiration",
        "creditOnce",
        "depositBonus",
        "depositCount",
        "depositMatchPercentage",
        "depositCountMatch"
      ],
      bonus
    ),
    limits
  } as CreateBonusValues);

export { transformError, getBonusValues };
