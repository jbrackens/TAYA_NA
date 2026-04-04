// @flow
import type { AffiliateContactDetails, PaymentMethod, PaymentMethodDetails } from '../repository/affiliates';
import type { UserRole } from '../repository/auth';

export type LoginRequest = {
  email: string,
  password: string,
};

export type LoginResponse = {
  email: string,
  roles: UserRole[],
};

export type AcceptTCRequest = {
  session: {
    affiliateId: Id,
  },
};

export type AcceptTCResponse = OkResult;

export type PasswordChangeRequest = {
  session: {
    affiliateId: Id,
  },
  oldPassword: string,
  newPassword: string,
};

export type PasswordForgotRequest = {
  email: string,
};

export type PasswordUpdateRequest = {
  email: string,
  pinCode: string,
  newPassword: string,
};

export type PasswordChangeResponse = OkResult;

export type PasswordForgotResponse = OkResult;

export type PasswordUpdateResponse = OkResult;

export type AffiliateRegisterRequest = {
  affiliate: {
    name: string,
    password: string,

    ...AffiliateContactDetails,

    paymentMethod: PaymentMethod,
    paymentMethodDetails: PaymentMethodDetails,
  },
  query: {
    referral?: Id,
  },
};

export type AffiliateRegisterResponse = {
  affiliateId: Id,
};

export type AffiliateLoginResponse = {
  affiliateId: Id,
  tcAccepted: boolean,
};
