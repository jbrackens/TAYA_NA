import * as Payment from "payment";
import { useMemo } from "react";
import { yup } from "@brandserver-client/lobby";
import { useMessages } from "@brandserver-client/hooks";
import { DepositTypes, DirectaProviders } from "../types";
import { useDeposit } from "../context";
import { useMinDepositAmount } from "../hooks/useMinDepositAmount";

const testCardExpiryDate = (value: string | undefined) =>
  Payment.fns.validateCardExpiry(value!);

const useValidationSchema = () => {
  const { selectedDepositMethod } = useDeposit();
  const minAmount = useMinDepositAmount();

  const { id, type, lowerLimit, upperLimit, accountId } = selectedDepositMethod;

  const isDirecta24 =
    id === DirectaProviders.Pix ||
    id === DirectaProviders.Boleto ||
    id === DirectaProviders.Itau ||
    id === DirectaProviders.PagoEfectivo ||
    id === DirectaProviders.BCP;

  const messages = useMessages({
    amount: "my-account.deposit.enter-amount",
    number: "my-account.deposit.creditcard.card-number",
    nationalId: "my-account.deposit.nationalId",
    holder: "my-account.deposit.creditcard.card-holder",
    date: "my-account.deposit.creditcard.expiry-date",
    cvv: "my-account.deposit.creditcard.cvv",
    accountId: "my-account.deposit.neteller.accountid"
  });

  const minDeposit = minAmount ? Math.max(minAmount, lowerLimit) : lowerLimit;

  const validationSchema = useMemo(
    () =>
      yup.object().shape({
        amount: yup
          .number()
          .required()
          .min(minDeposit)
          .max(upperLimit)
          .label(messages.amount),
        nationalId: isDirecta24
          ? yup.string().required().label(messages.nationalId)
          : yup.string().notRequired()
      }),
    [selectedDepositMethod, messages]
  );

  const savedCreditCardValidationSchema = useMemo(
    () =>
      yup.object().shape({
        amount: yup
          .number()
          .required()
          .min(minDeposit)
          .max(upperLimit)
          .label(messages.amount)
      }),
    [selectedDepositMethod, messages]
  );

  const creditCardValidationSchema = useMemo(
    () =>
      yup.object().shape({
        amount: yup
          .number()
          .required()
          .min(minDeposit)
          .max(upperLimit)
          .label(messages.amount),
        cardHolderName: yup.string().required().label(messages.holder),
        cardExpiryDate: yup
          .string()
          .required()
          .test(
            "test",
            "my-account.deposit.creditcard.expiry-date",
            testCardExpiryDate
          )
          .label(messages.date)
      }),
    [selectedDepositMethod, messages]
  );

  const netellerValidationSchema = useMemo(
    () =>
      yup.object().shape({
        amount: yup
          .number()
          .required()
          .min(minDeposit)
          .max(upperLimit)
          .label(messages.amount),
        accountId: yup.string().required().email().label(messages.accountId)
      }),
    [selectedDepositMethod, messages]
  );

  switch (type) {
    case DepositTypes.EnterCash:
    case DepositTypes.Iframe:
      return validationSchema;
    case DepositTypes.CreditCard:
      return accountId
        ? savedCreditCardValidationSchema
        : creditCardValidationSchema;
    case DepositTypes.Neteller:
      return netellerValidationSchema;
    default:
      return validationSchema;
  }
};

export { useValidationSchema };
