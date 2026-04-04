const validateDuration = (value: string) => {
  let error;

  if (!value) {
    error = "Field is a required";
  }

  return error;
};

const validateReason = (value: string) => {
  let error;

  if (!value) {
    error = "Field is a required";
  }

  return error;
};

const validatePeriod = (value: string) => {
  let error;

  if (!value) {
    error = "Field is a required";
  }

  return error;
};

const validatePlaytimeLimit = (value: string) => {
  let error;

  if (!value) {
    error = "Field is a required";
  }

  return error;
};

const validateLimit = (value: number) => {
  let error;

  if (value <= 0) {
    error = "Limit should be a positive";
  }

  if (!value) {
    error = "Field is a required";
  }

  if (value / 100 >= 10000001) {
    error = "Limit should be a less than 10000001";
  }

  return error;
};

export { validateDuration, validateReason, validatePeriod, validatePlaytimeLimit, validateLimit };
