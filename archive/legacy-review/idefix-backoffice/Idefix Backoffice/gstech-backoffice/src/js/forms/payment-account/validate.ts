import { isValidEmail, isValidIban, isSwedishBankAccount, isCanadianBankAccount, isMaskedAccount, isBrazilianAccount, isPeruvianAccount, isChileanAccount, isProvidedByDirecta24, isValidBrazilBankBranch } from "../validators";
import { FormValues } from "../../dialogs/view-payment-account";
import { FormValues as KycProcessValues } from "../../modules/kyc-process/Component";
import { AccountDocument } from "app/types";

export default (values: FormValues | KycProcessValues) => {
  let errors: { account?: string; bic?: string; parameters?: { accountType?: string, bankCode?: string; bankBranch?: string; }, documents?: string; } = {};

  const { method, account, parameters, documents, kycChecked } = values;

  if (!account && account === "") {
    errors.account = "Account is required";
  }

  if (
    account !== "" &&
    method === "BankTransfer" &&
    !isValidIban(account) &&
    !isSwedishBankAccount(account) &&
    !isCanadianBankAccount(account) &&
    !isMaskedAccount(account)
  ) {
    errors.account = "Invalid Iban number";
  }

  const bic = parameters && parameters.bic;
  if (
    method === "BankTransfer" &&
    !isSwedishBankAccount(account) &&
    !isCanadianBankAccount(account) &&
    !isMaskedAccount(account) &&
    (!bic || bic.length > 16 || bic.length < 4)
  ) {
    errors.bic = "Should contain 4-16 chars";
  }


  if (account !== "" && isProvidedByDirecta24(method)) {
    if (method === "BrazilBankWD" && !isBrazilianAccount(account))
      errors.account = "Brazilian account number must have 9 digits";
    if (method === "PeruBankWD" && !isPeruvianAccount(account))
      errors.account = "Peruvian account number must have 20 digits";
    if (method === "ChileBankWD" && !isChileanAccount(account))
      errors.account = "Chilean account number must be between 6 and 16 digits";
  }

  const accountType = parameters && parameters.accountType;
  if (
    isProvidedByDirecta24(method) &&
    (!accountType || accountType.length !== 1)
  ) {
    if (errors.parameters)
      errors.parameters.accountType = "Should be Savings or Current";
    else
      errors.parameters = { accountType: "Should be Savings or Current" };
  }

  const bankCode = parameters && parameters.bankCode;
  if (
    isProvidedByDirecta24(method) &&
    (!bankCode || bankCode.length !== 3)
  ) {
    if (errors.parameters)
      errors.parameters.bankCode = "Should contain 3 chars";
    else
      errors.parameters = { bankCode: "Should contain 3 chars" };
  }

  const bankBranch = parameters && parameters.bankBranch;
  if (method === "BrazilBankWD" && !isValidBrazilBankBranch(bankBranch)) {
    if (errors.parameters)
      errors.parameters.bankBranch = "Invalid bank branch";
    else
      errors.parameters = { bankBranch: "Invalid bank branch" };
  }

  if (method === "Skrill" && !isValidEmail(values.account)) {
    errors.account = "Should be a valid email address";
  }

  if (method === "Neteller" && !isValidEmail(values.account)) {
    errors.account = "Should be a valid email address";
  }

  // @ts-ignore
  if (kycChecked && (!documents || !documents.filter((doc: AccountDocument) => doc.formStatus !== "removed").length)) {
    errors.documents = "Needs at least one document";
  }

  return errors;
};
