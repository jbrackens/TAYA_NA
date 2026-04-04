// @ts-nocheck
import isInteger from "lodash/fp/isInteger";
import set from "lodash/set";

// TODO use `yup` lib
const bonusValidationShcema = ({
  name,
  wageringRequirementMultiplier,
  daysUntilExpiration,
  depositCount,
  depositBonus,
  depositMatchPercentage,
  limits
}) => {
  const errors = {};

  if (!name) {
    errors.name = "Required";
  }

  if (!isInteger(Number(wageringRequirementMultiplier))) {
    errors.wageringRequirementMultiplier = "Should be a number";
  }

  if (wageringRequirementMultiplier !== 0 && !wageringRequirementMultiplier) {
    errors.wageringRequirementMultiplier = "Required";
  }

  if (!isInteger(Number(daysUntilExpiration) || Number(daysUntilExpiration) === 0)) {
    errors.daysUntilExpiration = "Should be a positive integer";
  }

  if (daysUntilExpiration !== 0 && !daysUntilExpiration) {
    errors.daysUntilExpiration = "Required";
  }

  if (depositBonus && !isInteger(Number(depositCount))) {
    errors.depositCount = "Should be a number";
  }

  if (depositBonus && !depositCount) {
    errors.depositCount = "Required";
  }

  if (depositBonus && !isInteger(Number(depositMatchPercentage))) {
    errors.depositMatchPercentage = "Should be a number";
  }

  if (depositBonus && !depositMatchPercentage) {
    errors.depositMatchPercentage = "Required";
  }

  if (depositBonus) {
    limits.forEach((limit, index) => {
      if (limit.minAmount > limit.maxAmount) {
        set(errors, `limits[${index}][maxAmount]`, "Should be bigger or equal to minimum");
        set(errors, `limits[${index}][minAmount]`, "Should be less or equal to maximum");
      }

      if (!limit.minAmount) {
        set(errors, `limits[${index}][minAmount]`, "Field is required");
      }

      if (!limit.maxAmount) {
        set(errors, `limits[${index}][maxAmount]`, "Field is required");
      }

      if (limit.minAmount < 0) {
        set(errors, `limits[${index}][minAmount]`, "Should be a positive");
      }

      if (limit.maxAmount < 0) {
        set(errors, `limits[${index}][maxAmount]`, "Should be a positive");
      }
    });
  } else {
    limits.forEach((limit, index) => {
      if (limit.minAmount < 0) {
        set(errors, `limits[${index}][minAmount]`, "Should be a positive");
      }
    });
  }

  return errors;
};

export { bonusValidationShcema };
