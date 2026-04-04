import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js/max";
import { validate } from "email-validator";
import IBAN from "iban";
import { DIRECTA24_WD_PAYMENT_METHODS } from "@idefix-backoffice/idefix/utils";

export const swedishBankAccountRegex = /^([0-9\- ]{4,7})[ ]{0,1}\/[ ]{0,1}([0-9 -]{5,15})$/;
export const canadianBankAccountRegex = /^([0-9]{10,25})$/;
export const maskedIbanRegex = /^FI\d\d\d\d\*\*\*\*\*\*\*\*\d\d\d\d$/;
export const brazilianBankAccountRegex = /^\d{1,14}(-)?[\dxX]$/;
export const brazilianBankBranchRegex = /^\d{1,4}(-)?[\dxX]$/;
export const peruvianBankAccountRegex = /^[0-9]{20}$/;
export const chileanBankAccountRegex = /^\d{6,16}$/;

export const isValidMobilePhone = (number: string) => {
  if (!isValidPhoneNumber(number)) {
    return false;
  }

  const parsed = parsePhoneNumber(number);
  const type = parsed.getType();

  if (type == null) {
    return true; // Unknown
  }

  if (type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE") {
    return true;
  }

  return false;
};

export const isValidEmail = (email: string) => validate(email);
export const isValidAmount = (amount: number | string) => /^-?\d+(?:\.\d{0,2})?$/.test(String(amount));
export const isSwedishBankAccount = (account: string) => swedishBankAccountRegex.test(account);
export const isCanadianBankAccount = (account: string) => canadianBankAccountRegex.test(account);
export const isMaskedAccount = (account: string) => maskedIbanRegex.test(account);
export const isBrazilianAccount = (account: string) => brazilianBankAccountRegex.test(account);
export const isPeruvianAccount = (account: string) => peruvianBankAccountRegex.test(account);
export const isChileanAccount = (account: string) => chileanBankAccountRegex.test(account);
export const isProvidedByDirecta24 = (method?: string) => method && DIRECTA24_WD_PAYMENT_METHODS.includes(method);
export const isValidBrazilBankBranch = (bankBranch?: string) => bankBranch && brazilianBankBranchRegex.test(bankBranch);

const ibanBlockList = [
  "FI1517333000013371",
  "FI4940550011802341",
  "FI5580001471317405",
  "FI7331313001283977",
  "FI5815903000201382",
  "FI7249240010460322",
  "FI5357100420218729",
  "FI6947440010094194",
  "FI8636363010270783",
  "FI2743091820151106",
  "FI6966010001108398",
  "FI2880001171297279",
  "FI9215903000175065",
  "FI9457100420215857",
  "FI9666010001037878",
  "FI9039390059758946",
  "FI8531313001265040",
  "FI9039390059758946",
  "FI1340550010731624",
  "FI8647130010040020",
  "FI2543091520172725",
  "FI7341080011025155",
  "FI8166010010228898",
  "DE27700111100009000500",
  "DE95700111103456789004"
];

export const isValidIban = (account: string) => {
  if (!IBAN.isValid(account)) {
    return false;
  }
  return !ibanBlockList.includes(IBAN.electronicFormat(account));
};
