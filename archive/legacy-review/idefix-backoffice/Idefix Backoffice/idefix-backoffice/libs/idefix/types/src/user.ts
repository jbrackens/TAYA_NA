import { BrandInit } from "./settings";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  token: string;
  settings: {
    brands: BrandInit[];
  };
}

export interface User {
  id: number;
  accountClosed: boolean;
  administratorAccess: boolean;
  reportingAccess: boolean;
  loginBlocked: boolean;
  requirePasswordChange: boolean;
  email: string;
  handle: string;
  name: string;
  mobilePhone: string;
  createdAt: string;
  lastSeen: string;
  lastPasswordReset: string;
}

export interface FullUser extends User {
  hash: string;
  badLoginCount: number;
  lastBadLogin: string;
  campaignAccess: boolean;
  paymentAccess: boolean;
  riskManager: boolean;
}

export interface UserCurrentAccessSettings {
  reportingAccess: boolean;
  administratorAccess: boolean;
  paymentAccess: boolean;
  campaignAccess: boolean;
  riskManager: boolean;
}

export interface UserAccessSettings extends UserCurrentAccessSettings {
  accountClosed: boolean;
  loginBlocked: boolean;
  requirePasswordChange: boolean;
}

export interface UserLog {
  event: string;
  time: string;
  ip: string;
}

export interface UserDraft {
  name: string;
  mobilePhone: string;
  accountClosed: boolean;
  administratorAccess: boolean;
  badLoginCount: number;
  campaignAccess: boolean;
  createdAt: string;
  email: string;
  handle: string;
  hash: string;
  id: number;
  lastBadLogin: null | number;
  lastPasswordReset: string;
  lastSeen: string;
  loginBlocked: boolean;
  paymentAccess: boolean;
  reportingAccess: boolean;
  requirePasswordChange: boolean;
  riskManager: boolean;
}

export interface NewPasswordDraft {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordValues extends ChangePasswordRequest {
  email: string;
}
