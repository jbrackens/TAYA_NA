export const tabs = ["Account", "Contact info", "Billing"];

export type AccountDataType = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type ContactDataType = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
};

export type BillingDataType = {
  company_name: string;
  billing_email: string;
  tax_id: string;
  company_reg_no: string;
  country: string;
  address1: string;
  address2: string;
  city: string;
  postal_code: string;
  region: string;
};
