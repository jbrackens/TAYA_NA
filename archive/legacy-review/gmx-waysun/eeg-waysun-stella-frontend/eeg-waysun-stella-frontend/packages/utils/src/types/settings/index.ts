export const SettingsTabs = ["Profile settings", "Change password", "Billing"];

export enum status {
  PROCESSING = "processing",
  OK = "ok",
  DONE = "done",
}

export const profileDataInitialValues: ProfileFormData = {
  username: "",
  email: "",
};

export const billingDataInitialValues: BillingFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  company_name: "",
  billing_email: "",
  tax_id: "",
  company_reg_no: "",
  country: "",
  address1: "",
  address2: "",
  city: "",
  postal_code: "",
  region: "",
};

export type SettingsPagesProfileProps = {
  data: ProfileFormData;
  onChangeData: (data: ProfileFormData) => void;
};

export type SettingsPagesBillingProps = {
  data: BillingFormData;
  onChangeData: (data: BillingFormData) => void;
};

export type ProfileFormData = {
  username: string;
  email: string;
};

export type BillingFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
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

export type ProfileDetailsDataType = {
  status: string;
  details: ProfileFormData;
};

export type ChangePasswordApiResponseData = {
  status: string;
  details: {};
};

export type ChangePasswordPayloadData = {
  old_password: string;
  new_password: string;
};
