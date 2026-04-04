const PASSWORD = /^(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[!"#%&/()=\+\-_.:,;<>@0-9]).*$/;
const PHONE_NUMBER = /\+\d{6,12}/;
const NUMERIC = /^[0-9]*$/;

export const regexes = {
  PASSWORD,
  PHONE_NUMBER,
  NUMERIC
};
