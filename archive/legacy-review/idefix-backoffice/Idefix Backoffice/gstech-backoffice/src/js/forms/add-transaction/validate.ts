import { isValidAmount } from "../validators";
import { FormValues } from "../../dialogs/add-transaction";

export default (values: FormValues) => {
  let errors: { type?: string; accountId?: string; amount?: string; reason?: string } = {};

  if (!values.type) {
    errors.type = "Type is required";
  }

  if (values.type === "withdraw" && !values.accountId) {
    errors.accountId = "Account id is required";
  }

  if (values.type !== "correction" && values.amount < 0) {
    errors.amount = "Should be positive";
  }

  if (!isValidAmount(values.amount)) {
    errors.amount = "Should be a number";
  }

  if (!values.amount) {
    errors.amount = "Amount is required";
  }

  if (!values.reason) {
    errors.reason = "Reason is required";
  }

  return errors;
};
