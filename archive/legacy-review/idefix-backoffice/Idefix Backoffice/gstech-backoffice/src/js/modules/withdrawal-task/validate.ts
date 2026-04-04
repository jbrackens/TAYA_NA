import isNil from "lodash/fp/isNil";
import { WithdrawalWithOptions } from "app/types";
import { Values } from "./withdrawalTaskSlice";

interface Errors {
  paymentProviderId?: string;
  amount?: string;
}

export default (withdrawal: WithdrawalWithOptions | null, values: Values) => {
  let isValid: boolean = true;
  let errors: Errors = {};

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
