import * as React from "react";
import { Form, FormikProps } from "formik";
import styled from "styled-components";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import { EarthIcon } from "@brandserver-client/icons";
import { getCoinIcon } from "@brandserver-client/utils";
import { useDeposit } from "../context";
import { useMinDepositAmount } from "../hooks/useMinDepositAmount";
import { useDepositFormMessages } from "../hooks/useDepositFormMessages";
import { useBonusAmount } from "../hooks/useBonusAmount";
import { usePopulateAccountId } from "../hooks/usePopulateAccountId";
import type {
  FormValues,
  HostedFields,
  HostedFieldsCallbackResponse
} from "../types";
import { DepositTypes } from "../types";
import { isDirectaProvider } from "../utils";
import { BackButton } from "./BackButton";
import { DepositLimit } from "./DepositLimit";
import { DepositFreeSpins } from "./DepositFreeSpins";
import { SavedCreditCardSubForm } from "./SavedCreditCardSubForm";
import { EnterCashSubForm } from "./EnterCashSubForm";
import { NetellerSubForm } from "./NetellerSubForm";
import { CreditCardSubForm } from "./CreditCardSubForm";

interface Props {
  formik: FormikProps<FormValues>;
  hostedFieldsValuesRef: React.MutableRefObject<
    HostedFieldsCallbackResponse | undefined
  >;
}

const DepositForm: React.FC<Props> = ({
  formik: {
    setFieldValue,
    values,
    isValid,
    isSubmitting,
    handleChange,
    handleBlur,
    submitForm
  },
  hostedFieldsValuesRef
}) => {
  const {
    deposit,
    bonus,
    campaign,
    selectedDepositMethod,
    freeSpins,
    onToggleSplashScreen,
    onSelectDepositMethod,
    onCancelLimit
  } = useDeposit();

  const { messages } = useDepositFormMessages();

  const {
    Select,
    Note,
    AmountButton,
    Field,
    AmountInput,
    TextInput,
    SubmitButton
  } = useRegistry();

  const minDepositAmount = useMinDepositAmount();

  const bonusAmount = useBonusAmount(Number(values.amount));

  usePopulateAccountId();

  const hostedFieldsRef = React.useRef<HostedFields>();

  const handleSetAmount = React.useCallback(
    (amount: number) => setFieldValue("amount", amount),
    [setFieldValue]
  );

  const handleSelectBank = React.useCallback(
    (bankId: string) => setFieldValue("selectedBank", bankId),
    [setFieldValue]
  );

  const getEncHostedValues = React.useCallback(() => {
    if (hostedFieldsRef.current) {
      hostedFieldsRef.current.get();
    }

    setTimeout(() => {
      submitForm();
    }, 100);
  }, [submitForm]);

  const { depositOptions, depositMethods, limit } = deposit;

  const currentBonus = bonus || campaign;

  const CoinIcon = getCoinIcon(selectedDepositMethod.currencyISO);

  return (
    <StyledDepositForm>
      <div className="form__main">
        <div className="form__column">
          {currentBonus && (
            <BackButton
              bonus={currentBonus}
              onToggleSplashScreen={onToggleSplashScreen}
            />
          )}
          {depositMethods.length !== 1 && (
            <>
              <div className="deposit-field">
                <label className="deposit-field__label">
                  {messages.chooseMethod}
                </label>
                <Select
                  name="depositMethod"
                  value={selectedDepositMethod.uid}
                  onChange={event => onSelectDepositMethod(event.target.value)}
                  className="deposit-field__select select__input--deposit"
                >
                  {depositMethods.map(depositMethod => (
                    <option
                      key={depositMethod.uid}
                      value={depositMethod.uid}
                      disabled={
                        (!!minDepositAmount &&
                          depositMethod.upperLimit < minDepositAmount) ||
                        (!!currentBonus && depositMethod.disabledWithBonus)
                      }
                    >
                      {depositMethod.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="deposit-info-text">
                {selectedDepositMethod.fee && (
                  <Note className="deposit-fee" note={messages.depositFee} />
                )}
                <div className="deposit-field__copyright-text">
                  {selectedDepositMethod.copyrightText}
                  {!!limit && (
                    <DepositLimit limit={limit} onCancelLimit={onCancelLimit} />
                  )}
                </div>
              </div>
            </>
          )}
          <div className="amount-field">
            <label className="amount-field__label">{messages.amount}</label>
            <div className="amount-field__button-group">
              {(
                currentBonus?.amounts ||
                depositOptions.amounts ||
                selectedDepositMethod.amounts
              ).map(depositAmount => (
                <AmountButton
                  key={depositAmount}
                  onClick={() => handleSetAmount(depositAmount)}
                  active={Number(values.amount) === depositAmount}
                >{`${depositAmount}${
                  selectedDepositMethod?.currencySymbol || ""
                }`}</AmountButton>
              ))}
            </div>
            {freeSpins.length > 0 && (
              <DepositFreeSpins
                freeSpins={freeSpins}
                amount={Number(values.amount)}
                setAmount={handleSetAmount}
                separator={
                  currentBonus && currentBonus.freespinsSeparator !== undefined
                    ? currentBonus.freespinsSeparator
                    : depositOptions.freespinsSeparator
                }
              />
            )}
            <div className="deposit__fields-group">
              <Field name="amount">
                <AmountInput
                  className="base-input__input-component--deposit"
                  placeholder={messages.enterAmount}
                  pattern="^[0-9]*$"
                  type="number"
                  rightIcon={<CoinIcon />}
                  bonusAmount={bonusAmount}
                />
              </Field>
              {selectedDepositMethod.type === DepositTypes.CreditCard &&
                selectedDepositMethod.accountId && (
                  <SavedCreditCardSubForm
                    hostedFieldsRef={hostedFieldsRef}
                    hostedFieldsValuesRef={hostedFieldsValuesRef}
                  />
                )}
            </div>
            {isDirectaProvider(selectedDepositMethod.id) && (
              <Field name="nationalId">
                <TextInput
                  name="nationalId"
                  type="text"
                  placeholder={messages.nationalId}
                  rightIcon={<EarthIcon />}
                />
              </Field>
            )}
          </div>
          {selectedDepositMethod.type === DepositTypes.EnterCash &&
            selectedDepositMethod.options &&
            selectedDepositMethod.options.length > 0 && (
              <EnterCashSubForm
                options={selectedDepositMethod.options}
                isValid={isValid && !isSubmitting}
                onSubmit={handleSelectBank}
              />
            )}
          {selectedDepositMethod.type === DepositTypes.Neteller && (
            <NetellerSubForm
              values={values}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          )}
        </div>
        {selectedDepositMethod.type === DepositTypes.CreditCard &&
          !selectedDepositMethod.accountId && (
            <div className="form__column">
              <CreditCardSubForm
                values={values}
                hostedFieldsRef={hostedFieldsRef}
                hostedFieldsValuesRef={hostedFieldsValuesRef}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
          )}
      </div>
      {(!selectedDepositMethod.options ||
        selectedDepositMethod.options.length === 0) && (
        <div className="form__footer">
          <SubmitButton
            disabled={depositMethods.length === 0}
            color={SubmitButton.Color.accent}
            size={SubmitButton.Size.large}
            type={
              selectedDepositMethod.type === DepositTypes.CreditCard
                ? "button"
                : "submit"
            }
            onClick={
              selectedDepositMethod.type === DepositTypes.CreditCard
                ? getEncHostedValues
                : undefined
            }
          >
            {messages.deposit}
          </SubmitButton>
        </div>
      )}
    </StyledDepositForm>
  );
};

const StyledDepositForm = styled(Form)`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    justify-content: space-between;
    margin: auto;
  }

  @media screen and (min-width: 992px) {
    align-items: flex-start;
  }

  .form__main {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;

    @media screen and (min-width: 992px) {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  .form__column {
    width: 100%;
    max-width: 342px;
  }

  .form__column + .form__column {
    @media screen and (min-width: 992px) {
      margin-left: 40px;
    }
  }

  .form__footer {
    width: 100%;
    max-width: 342px;
    margin-bottom: 15px;
  }

  .deposit-info-text {
    min-height: 18px;
  }

  .deposit-field__select {
    margin-top: 22px;
  }

  .deposit-field__copyright-text {
    margin: 6px 0 10px 0;
    ${({ theme }) => theme.typography.text14};
    line-height: 18px;
    color: ${({ theme }) => theme.palette.primary};
  }

  .deposit-field__label,
  .amount-field__label {
    white-space: nowrap;
    ${({ theme }) => theme.typography.text21BoldUpper};

    display: inline-block;
    color: ${({ theme }) => theme.palette.contrastLight};
  }

  .amount-field__button-group {
    display: flex;
    justify-content: space-around;
    margin: 16px 0 16px 0;

    button {
      height: 56px;
      width: 56px;
    }
  }

  .deposit__fields-group {
    display: flex;
    width: 100%;

    /* Gap between children */
    & > *:not(:first-child) {
      margin-left: 28px;
      max-width: 96px;
    }
  }

  .select__input {
    padding: 16px;
  }

  .deposit-fee {
    margin: 8px 0 6px;
  }
`;

export { DepositForm };
