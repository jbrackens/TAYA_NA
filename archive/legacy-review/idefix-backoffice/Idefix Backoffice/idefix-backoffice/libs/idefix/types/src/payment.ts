import { AccountDocument } from "./document";

export interface PaymentMethod {
  id: number;
  name: string;
  active: boolean;
  allowAutoVerification: boolean;
  highRisk: boolean;
  requireVerification: boolean;
}

export interface PaymentMethodLimit {
  brandId: string;
  currencyId: string;
  paymentMethodId: number;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
}

export interface PaymentProvider {
  id: number;
  name: string;
  deposits: boolean;
  withdrawals: boolean;
  paymentMethodId: number;
  active: boolean;
  priority: number;
  currencies: unknown[];
  countries: unknown[];
}

export interface PaymentMethodProvider {
  id: number;
  name: string;
  active: boolean;
  requireVerification: boolean;
  allowAutoVerification: boolean;
  highRisk: boolean;
  paymentProviders: Omit<PaymentProvider, "currencies" | "countries">[];
}

export interface PaymentEvent {
  timestamp: string;
  status: string;
  message: string;
  handle: string;
}

export interface PaymentAccountDraft {
  method: string;
  account: string;
  accountHolder?: string;
  kycChecked?: boolean;
  parameters?: Record<string, unknown>;
  documents?: AccountDocument[];
}
