import set from "lodash/set";
import { GameFormValues } from "./types";

const permalinkRegex = /^[a-z0-9]*$/;

// TODO use `yup` for validation
const gameValidationSchema = (values: GameFormValues) => {
  const errors: Partial<Record<keyof GameFormValues, string>> = {};

  if (!values.name) {
    errors.name = "Required";
  }

  if (!values.gameId) {
    errors.gameId = "Required";
  }

  if (!values.manufacturerId) {
    errors.manufacturerId = "Required";
  }

  if (!values.manufacturerGameId) {
    errors.manufacturerGameId = "Required";
  }

  if (!values.permalink) {
    errors.permalink = "Required";
  }

  if (values.permalink && !permalinkRegex.test(values.permalink)) {
    errors.permalink = "Should be a-z 0-9 lowercase";
  }

  if (values.rtp && (Number(values.rtp) >= 100 || Number(values.rtp) < 0)) {
    errors.rtp = "Should be less than 100%";
  }

  values.profiles &&
    values.profiles.forEach((profile, index) => {
      if (!profile) {
        set(errors, `profiles[${index}]`, "Required");
      }
    });

  return errors;
};

export { gameValidationSchema };
