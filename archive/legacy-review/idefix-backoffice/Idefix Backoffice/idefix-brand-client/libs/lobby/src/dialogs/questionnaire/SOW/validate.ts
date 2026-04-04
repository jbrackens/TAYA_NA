import { FormValues } from "./types";

interface Errors {
  options?: boolean;
  explanation?: boolean;
}

function validate({ options, explanation }: FormValues) {
  const errors: Errors = {};

  const hasCheckedOption = Object.values(options).some(
    (option: boolean) => option === true
  );

  if (!hasCheckedOption) {
    errors.options = true;
  }

  if (options.other && explanation === "") {
    errors.explanation = true;
  }

  return errors;
}

export default validate;
