import isNil from "lodash/fp/isNil";
import { WithdrawalWithOptions } from "@idefix-backoffice/idefix/types";

interface Errors {
  paymentProviderId?: string;
  amount?: string;
}

export const validate = (withdrawal: WithdrawalWithOptions | null, values: any) => {
  const errors: Errors = {};
  let isValid = true;

  if (!withdrawal && !values) {
    return { isValid, errors };
  }

  if (isNil(values?.paymentProviderId)) {
    isValid = false;
    errors.paymentProviderId = "Payment provider is required";
  }

  if (withdrawal && withdrawal?.amount < Math.round(Number(values?.amount) * 100)) {
    isValid = false;
    errors.amount = "Should be less or equal to requested amount";
  }

  const regex = /^-?\d+(?:\.\d{0,2})?$/;
  if (!regex.test(values?.amount)) {
    errors.amount = "Should be a valid amount";
    isValid = false;
  }

  return { isValid, errors };
};
