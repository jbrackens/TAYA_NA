import * as React from "react";
import styled from "styled-components";
import { Formik, Form } from "formik";
import { useMessages } from "@brandserver-client/hooks";
import { yup } from "@brandserver-client/lobby";
import { useRegistry } from "@brandserver-client/ui";
import {
  CurrencyISO,
  SubmitExclusion,
  LimitPeriodType,
  LimitLength,
  LimitLengthWithText,
  Exclusion
} from "@brandserver-client/types";
import ConfirmationBlock from "./ConfirmationBlock";
import { formatToCents, getCoinIcon } from "@brandserver-client/utils";

const StyledDepositBlock = styled.div`
  .deposit-block__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    ${({ theme }) => theme.palette.contrast};
    margin-bottom: 16px;
  }

  .deposit-block__description {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrastDark};
    margin-bottom: 36px;
  }

  .deposit-block__fields {
    display: flex;
    justify-content: space-between;
  }

  .deposit-block__input {
    height: 56px;
  }

  .deposit-block__select {
    select {
      height: 56px;
    }
  }

  .deposit-block__space {
    min-width: 36px;
    max-width: 36px;
    height: 100%;
  }

  .deposit-block__deposit-buttons {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .deposit-block__deposit-button {
    width: 52px;
    height: 52px;
  }

  .deposit-block__buttons {
    display: flex;
    justify-content: space-between;
  }

  .deposit-block__button {
    width: 100px;
  }

  .deposit-block__button-confirm {
    width: 152px;
  }
`;

interface FormValues {
  limitValue: string;
  limitPeriodType: LimitPeriodType;
  limitLength: LimitLength;
}

const initialValues: FormValues = {
  limitValue: "",
  limitPeriodType: "daily",
  limitLength: 0
};

const LIMIT_TYPE: Exclusion["limitType"] = "deposit";

interface Props {
  minDepositLimit: number;
  timeLimits: LimitLengthWithText[];
  currency: { currencyISO: CurrencyISO; currencySymbol: string };
  onSubmit: (exclusion: SubmitExclusion) => void;
  className?: string;
}

const DepositBlock: React.FC<Props> = ({
  minDepositLimit,
  timeLimits,
  currency,
  onSubmit,
  className
}) => {
  const { Button, Field, TextInput, Select } = useRegistry();
  const CoinIcon = getCoinIcon(currency.currencyISO);

  const messages = useMessages({
    depositLimit: "my-account.self-exclusion.deposit-limit",
    limitPlaceholder: "my-account.self-exclusion.deposit-limit.placeholder",
    description: "my-account.self-exclusion.deposit-limit.description",
    limitValueLabel: "my-account.deposit.amount",
    perDay: "selfexclusion.per-day",
    perWeek: "selfexclusion.per-week",
    perMonth: "selfexclusion.per-month"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      limitValue: yup
        .number()
        .required()
        .min(minDepositLimit)
        .label(messages.limitValueLabel),
      limitPeriodType: yup
        .string()
        .required()
        .oneOf(["daily", "weekly", "monthly"]),
      limitLength: yup.number().required().oneOf([1, 7, 30])
    });
  }, [messages]);

  const handleSubmit = React.useCallback(
    ({ limitValue, ...rest }: FormValues) => {
      onSubmit({
        ...rest,
        limitValue: formatToCents(Number(limitValue)),
        limitType: LIMIT_TYPE
      });
    },
    [onSubmit]
  );

  return (
    <StyledDepositBlock className={className}>
      <div className="deposit-block__title">{messages.depositLimit}</div>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
      >
        {form => (
          <Form>
            {form.values.limitLength ? (
              <ConfirmationBlock
                exclusion={{
                  limitType: LIMIT_TYPE,
                  limitLength: form.values.limitLength,
                  limitValue: Number(form.values.limitValue),
                  limitPeriodType: form.values.limitPeriodType
                }}
                currencySymbol={currency.currencySymbol}
                cancel={() => form.resetForm()}
                submit={form.submitForm}
              />
            ) : (
              <>
                <div className="deposit-block__description">
                  {messages.description}
                </div>
                <div className="deposit-block__fields">
                  <Field name="limitValue">
                    <TextInput
                      className="deposit-block__input"
                      placeholder={messages.limitPlaceholder}
                      rightIcon={<CoinIcon />}
                      type="number"
                      pattern="^[0-9]*$"
                    />
                  </Field>
                  <div className="deposit-block__space" />
                  <Field name="limitPeriodType">
                    <Select className="deposit-block__select">
                      <option value="daily">{messages.perDay}</option>
                      <option value="weekly">{messages.perWeek}</option>
                      <option value="monthly">{messages.perMonth}</option>
                    </Select>
                  </Field>
                </div>
                <div className="deposit-block__buttons">
                  {timeLimits.map(limit => (
                    <Button
                      type="button"
                      key={limit.time}
                      className="deposit-block__button"
                      color={Button.Color.primaryLightest}
                      size={Button.Size.small}
                      disabled={
                        Number(form.values.limitValue) < minDepositLimit
                      }
                      onClick={() =>
                        form.setFieldValue("limitLength", limit.time)
                      }
                    >
                      {limit.message}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </Form>
        )}
      </Formik>
    </StyledDepositBlock>
  );
};

export default DepositBlock;
