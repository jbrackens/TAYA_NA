import set from "lodash/set";
import isNull from "lodash/fp/isNull";

export default ({
  name,
  limits,
}: {
  name: string;
  limits: { minDeposit: number; maxDeposit: number; minWithdrawal: number; maxWithdrawal: number }[];
}) => {
  let errors: { name?: string } = {};

  if (!name) {
    errors.name = "Required";
  }

  limits.forEach((limit, index) => {
    if (Number(limit.minDeposit) > Number(limit.maxDeposit)) {
      set(errors, `limits.${index}.maxDeposit`, "Should be bigger than minimum");
      set(errors, `limits.${index}.minDeposit`, "Should be less than maximum");
    }

    if (Number(limit.minWithdrawal) > Number(limit.maxWithdrawal)) {
      set(errors, `limits.${index}.maxWithdrawal`, "Should be bigger than minimum");
      set(errors, `limits.${index}.minWithdrawal`, "Should be less than maximum");
    }

    if (!limit.minWithdrawal && limit.minWithdrawal !== 0) {
      set(errors, `limits.${index}.minWithdrawal`, "Field is required");
    }

    if (!limit.maxWithdrawal && limit.maxWithdrawal !== 0) {
      set(errors, `limits.${index}.maxWithdrawal`, "Field is required");
    }

    if (!limit.minDeposit && limit.minDeposit !== 0) {
      set(errors, `limits.${index}.minDeposit`, "Field is required");
    }

    if (!limit.maxDeposit && limit.maxDeposit !== 0) {
      set(errors, `limits.${index}.maxDeposit`, "Field is required");
    }

    if (!isNull(limit.minDeposit) && limit.minDeposit <= 0) {
      set(errors, `limits.${index}.minDeposit`, "Should be bigger than 0");
    }

    if (!isNull(limit.maxDeposit) && limit.maxDeposit <= 0) {
      set(errors, `limits.${index}.maxDeposit`, "Should be bigger than 0");
    }

    if (limit.minWithdrawal < 0) {
      set(errors, `limits.${index}.minWithdrawal`, "Should be a positive");
    }

    if (limit.maxWithdrawal < 0) {
      set(errors, `limits.${index}.maxWithdrawal`, "Should be a positive");
    }
  });

  return errors;
};
