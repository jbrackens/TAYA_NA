/* @flow */
import type { Player, PlayerDraft } from '../../modules/types/player';

export type SessionToken = string;

export type GetCountriesResponse = Array<{| id: string, name: string, minimumAge: number, blocked: boolean, registrationAllowed: boolean, |}>;

export type RequestRegistrationRequest = { mobilePhone: string };
export type RequestRegistrationResponse = { mobilePhone: string, pinCode: string };
export type CompleteRegistrationRequest = { playerDraft: PlayerDraft, mobilePhone: string, pinCode: string };
export type CompleteRegistrationResponse = { player: Player, token: SessionToken, activationCode: UUID };

export type RequestLoginRequest = { mobilePhone?: string, email?: string };
export type RequestLoginResponse = { mobilePhone: string, pinCode: string };
export type CompleteLoginRequest = { mobilePhone?: string, email?: string, pinCode: string, ipAddress: IPAddress, userAgent: string };
export type CompleteLoginResponse = { player: Player, token: string };

export type RequestPasswordResetRequest = { mobilePhone?: string, email?: string, dateOfBirth: string };
export type RequestPasswordResetResponse = { mobilePhone: string, pinCode: string };
export type CompletePasswordResetRequest = { mobilePhone?: string, email?: string, pinCode: string, newPassword: string };
export type CompletePasswordResetResponse = { mobilePhone: string, ...OkResult };

export type CreditFreeSpinsResponse = OkResult;
export type CreateTransactionResponse = { transaction: string, balance: Balance };
export type CreditBonusResponse = { bonus: Bonus, balance: Balance };
export type GiveBonusResponse = { bonus: Bonus, balance: Balance };

export type ReportFraudResponse = { fraud: Id };
