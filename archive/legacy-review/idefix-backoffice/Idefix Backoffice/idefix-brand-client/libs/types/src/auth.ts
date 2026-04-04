export interface DefaultRegistration {
  pinCode: string;
  lander: string | null;
  bonusCode: string | null;
  firstName: string;
  lastName: string;
  address: string;
  postCode: string;
  city: string;
  dateOfBirth: string;
  countryISO: string;
  currencyISO: string;
  phone: string;
  receivePromotional: string;
  accept: string;
  lang: string;
  email: string;
  password: string;
}

export interface LoginWithEmailDraft {
  email: string;
  password: string;
  language: string;
  tz: number;
  token: string;
}

export interface LoginResponse {
  ok: boolean;
  code?: string;
  result?: string;
  deposits?: boolean;
  nextUrl?: null | string;
  restrictionActive?: boolean;
  content?: string;
  showRestrictionRequest?: boolean;
  expires?: string;
  exclusionKey?: string;
  permanent?: boolean;
}

export interface LoginRestriction {
  restrictionActive: boolean;
  content: string;
  showRestrictionRequest: boolean;
  exclusionKey: string;
  expires: string;
  permanent: boolean;
}

export interface PhoneValidationResponse {
  valid: boolean;
  number?: string;
}

export interface PhoneActivationResponse {
  ok?: boolean;
  result?: string;
  errorCode?: string;
  valid?: boolean;
  message?: string;
}

export interface SendCodeResponse {
  ok?: boolean;
  result?: string;
  errorCode?: string;
  valid?: boolean;
  message?: string;
}

export interface ResetPasswordResponse {
  ok?: boolean;
  number?: string;
  message?: string;
  result?: string;
}

export interface RegistrationResponse {
  ok: boolean;
  activated: boolean;
  register: boolean;
  code: string;
  nextUrl?: string;
  result?: string;
}
