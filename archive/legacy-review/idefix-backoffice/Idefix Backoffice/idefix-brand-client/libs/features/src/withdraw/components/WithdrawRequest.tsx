import * as React from "react";
import {
  PaymentMethod,
  CurrencyISO,
  WithdrawalFeeConfiguration
} from "@brandserver-client/types";
import styled from "styled-components";
import { Formik, Form, FormikHelpers } from "formik";
import {
  getWithdrawalFee,
  pushRoute,
  formatMoney,
  getCoinIcon
} from "@brandserver-client/utils";
import { useMessages } from "@brandserver-client/hooks";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import { WalletIcon } from "@brandserver-client/icons";
import { yup } from "@brandserver-client/lobby";
import { ApiContext } from "@brandserver-client/api";

const StyledWithdrawRequest = styled.div`
  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    max-width: 324px;
  }

  .withdraw__title {
    color: ${({ theme }) => theme.palette.primary};
    ${({ theme }) => theme.typography.text21BoldUpper};
    margin-bottom: 24px;
  }

  .withdraw-request__title {
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
    margin-bottom: 16px;
  }

  .withdraw-request__method {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
  }

  .withdraw-request__method-info {
    margin-left: 12px;
  }

  .withdraw-request__method-icon {
    width: 32px;
    height: 32px;
    fill: ${({ theme }) => theme.palette.accent};
  }

  .withdraw-request__method-title {
    ${({ theme }) => theme.typography.text16Bold};
    color: ${({ theme }) => theme.palette.contrastDark};
  }

  .withdraw-request__method-account {
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
  }

  .withdraw__loader-wrapper {
    margin-top: 8px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .withdraw__loader {
    width: 56px;
    height: 56px;
  }

  .withdraw__button {
    margin-top: 8px;
    height: 56px;
  }
`;

interface Props {
  withdrawalOptions: PaymentMethod[];
  withdrawalFee?: WithdrawalFeeConfiguration;
}

interface FormValues {
  withdrawalSource: number;
  withdrawAmount: string;
}

const WithdrawRequest: React.FC<Props> = ({
  withdrawalOptions,
  withdrawalFee
}) => {
  const [activeWithdrawal, setActiveWithdrawal] = React.useState<PaymentMethod>(
    withdrawalOptions[0]
  );

  const handleSetActiveWithdrawal = (paymentAccountID: string) => {
    const newWithdrawal = withdrawalOptions.find(
      withdrawalOption =>
        withdrawalOption.paymentAccountID === Number(paymentAccountID)
    )!;
    setActiveWithdrawal(newWithdrawal);
  };

  const { Field, Select, AmountInput, Loader, Button } = useRegistry();

  const api = React.useContext(ApiContext);

  const isManyWithdrawals = withdrawalOptions.length >= 2;

  const {
    lowerLimit,
    lowerLimit_formatted,
    upperLimit,
    upperLimit_formatted,
    currencySymbol,
    paymentAccountID,
    currencyISO,
    method,
    account
  } = activeWithdrawal;

  const CoinIcon = getCoinIcon(currencyISO as CurrencyISO);

  const messages = useMessages({
    withdrawMethod: "my-account.withdraw.method",
    withdraw: "my-account.withdraw",
    withdrawAmount: "my-account.withdraw.amount",
    enterAmount: "my-account.deposit.enter-amount",
    minMax: {
      id: "my-account.withdraw.min-max",
      values: { min: lowerLimit_formatted, max: upperLimit_formatted }
    },
    fee: "my-account.withdraw.withdraw.withdrawal-fee"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      withdrawalSource: yup.number().required(),
      withdrawAmount: yup
        .number()
        .required()
        .min(lowerLimit)
        .max(upperLimit)
        .label(messages.withdrawAmount)
    });
  }, [messages]);

  const handleSubmit = React.useCallback(
    async (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      try {
        const data = new URLSearchParams();
        data.append("paymentAccountID", values.withdrawalSource.toString());
        data.append("amount", values.withdrawAmount.toString());

        const { ok, update } = await api.withdraw.withdrawBalance(data);
        formikActions.setSubmitting(false);

        if (!ok && !update) {
          return pushRoute("/loggedin/myaccount/withdraw-failed");
        }

        return pushRoute("/loggedin/myaccount/withdraw-done");
      } catch (error: any) {
        formikActions.setSubmitting(false);
        throw Error(error);
      }
    },
    []
  );

  const initialValues = React.useMemo(
    () => ({
      withdrawalSource: paymentAccountID,
      withdrawAmount: ""
    }),
    [paymentAccountID]
  );

  const generateFee = (
    withdrawalFee: WithdrawalFeeConfiguration,
    amount: string
  ) =>
    formatMoney(
      getWithdrawalFee(
        amount,
        withdrawalFee.withdrawalfee,
        withdrawalFee.withdrawalfeemin,
        withdrawalFee.withdrawalfeemax
      ),
      currencySymbol
    );

  return (
    <StyledWithdrawRequest>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
      >
        {({ values, isSubmitting, isValid, dirty, setFieldValue }) => {
          return (
            // Added lang here because input can use comma instead of point depend on language
            <Form lang="en-US">
              <h2 className="withdraw__title">{messages.withdraw}</h2>
              {isManyWithdrawals ? (
                <Field name="withdrawalSource" label={messages.withdrawMethod}>
                  <Select
                    className="player-profile__language-selector"
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                      setFieldValue("withdrawalSource", event.target.value);
                      handleSetActiveWithdrawal(event.target.value);
                    }}
                  >
                    {withdrawalOptions.map(({ title, paymentAccountID }) => (
                      <option key={paymentAccountID} value={paymentAccountID}>
                        {title}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <>
                  <div className="withdraw-request__title">
                    {messages.withdrawMethod}
                  </div>
                  <div className="withdraw-request__method">
                    <WalletIcon className="withdraw-request__method-icon" />
                    <div className="withdraw-request__method-info">
                      <div className="withdraw-request__method-title">
                        {method}
                      </div>
                      <div className="withdraw-request__method-account">
                        {account}
                      </div>
                    </div>
                  </div>
                </>
              )}
              <Field
                name="withdrawAmount"
                label={messages.withdrawAmount}
                helper={<Field.HelperText>{messages.minMax}</Field.HelperText>}
              >
                <AmountInput
                  placeholder={messages.enterAmount}
                  pattern="^\d*[.]?\d{0,2}$"
                  type="number"
                  lang="en-US"
                  rightIcon={<CoinIcon />}
                  bonusAmount={
                    withdrawalFee &&
                    `${messages.fee} ${generateFee(
                      withdrawalFee,
                      values.withdrawAmount.toString()
                    )}`
                  }
                />
              </Field>
              {isSubmitting ? (
                <div className="withdraw__loader-wrapper">
                  <Loader className="withdraw__loader" />
                </div>
              ) : (
                <Button
                  className="withdraw__button"
                  color={Button.Color.accent}
                  type="submit"
                  disabled={!isValid || !dirty}
                >
                  {messages.withdraw}
                </Button>
              )}
            </Form>
          );
        }}
      </Formik>
    </StyledWithdrawRequest>
  );
};

export default WithdrawRequest;
