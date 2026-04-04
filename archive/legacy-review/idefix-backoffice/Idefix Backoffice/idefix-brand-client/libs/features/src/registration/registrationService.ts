import axios, { AxiosResponse } from "axios";
import {
  PhoneActivationResponse,
  PhoneValidationResponse,
  RegistrationResponse
} from "@brandserver-client/types";
import { errorCodes } from "@brandserver-client/utils";
import { Steps } from ".";

interface ValidatePhoneProps {
  phone: string;
  language: string;
  countryISO: string;
}

const validatePhone = async ({
  phone,
  language,
  countryISO
}: ValidatePhoneProps) => {
  const {
    data: { valid }
  } = await axios.post<unknown, AxiosResponse<PhoneValidationResponse>>(
    `/api/validate/phone?_lang=${language}`,
    {
      countryISO,
      phone
    }
  );

  if (!valid) {
    return Promise.reject({
      errors: [{ field: "phone", message: "error.462" }]
    });
  }
};

interface ActivatePhoneProps {
  phone: string;
  language: string;
  countryISO: string;
  email: string;
  retry?: boolean;
}

const activatePhone = async ({
  phone,
  email,
  language,
  countryISO,
  retry
}: ActivatePhoneProps) => {
  const {
    data: { ok, message, result }
  } = await axios.post<unknown, AxiosResponse<PhoneActivationResponse>>(
    "/api/activate/phone",
    {
      languageISO: language,
      phone,
      email,
      countryISO
    },
    { params: { retry, _lang: language } }
  );

  if (!ok) {
    // when user requests to resend pinCode, then it counts as a pin code error
    if (retry) {
      return Promise.reject({
        errors: [{ field: "resend-failed", message: message || result }]
      });
    }

    return Promise.reject({
      errors: [{ field: "phone", message: message || result }]
    });
  }
};

interface RegisterProps {
  pinCode: string;
  lander: string | null;
  firstName: string;
  lastName: string;
  address: string;
  postCode: string;
  city: string;
  dateOfBirth: string;
  countryISO: string;
  currencyISO: string;
  phone: string;
  receivePromotional: boolean;
  accept: "1" | "0";
  language: string;
  email: string;
  password: string;
}

const register = async ({ language, ...data }: RegisterProps) => {
  const {
    data: { ok, nextUrl, result, code }
  } = await axios.post<unknown, AxiosResponse<RegistrationResponse>>(
    `/api/register`,
    data,
    {
      params: { _lang: language }
    }
  );

  if (!ok) {
    const errorCode = code && code.toUpperCase();

    if (
      errorCode &&
      (errorCode === errorCodes.USER_ALREADY_EXISTS ||
        errorCode === errorCodes.PLAYER_ALREADY_EXISTS)
    ) {
      return Promise.reject({
        step: Steps.EmailAndPassword,
        errors: [{ field: "email", message: result }]
      });
    }

    if (errorCode && errorCode === errorCodes.PHONE_ALREADY_EXISTS) {
      return Promise.reject({
        step: Steps.PersonalInfo,
        errors: [{ field: "phone", message: result }]
      });
    }

    if (errorCode && errorCode === errorCodes.INVALID_PIN_CODE) {
      return Promise.reject({
        step: Steps.Confirmation,
        errors: [{ field: "pinCode", message: result }]
      });
    }

    return Promise.reject({
      errors: [{ field: "general", message: result }]
    });
  }

  return { nextUrl };
};

export { validatePhone, activatePhone, register };
