import * as React from "react";
import styled from "styled-components";
import { Formik, Form } from "formik";
import { useMessages } from "@brandserver-client/hooks";
import { yup } from "@brandserver-client/lobby";
import { useRegistry } from "@brandserver-client/ui";
import { formatToCents, getCoinIcon } from "@brandserver-client/utils";
import {
  CurrencyISO,
  SubmitExclusion,
  LimitPeriodType,
  LimitLength,
  LimitLengthWithText,
  Exclusion
} from "@brandserver-client/types";
import ConfirmationBlock from "./ConfirmationBlock";

const StyledLossBlock = styled.div`
  .loss-block__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.contrast};
    margin-bottom: 16px;
  }

  .loss-block__description {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrastDark};
    margin-bottom: 36px;
  }

  .loss-block__fields {
    display: flex;
    justify-content: space-between;
  }

  .loss-block__input {
    height: 56px;
  }

  .loss-block__select {
    select {
      height: 56px;
    }
  }

  .loss-block__space {
    min-width: 36px;
    max-width: 36px;
    height: 100%;
  }

  .loss-block__buttons {
    display: flex;
    justify-content: space-between;
  }

  .loss-block__button {
    width: 100px;
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

const LIMIT_TYPE: Exclusion["limitType"] = "loss";

interface Props {
  timeLimits: LimitLengthWithText[];
  currency: { currencyISO: CurrencyISO; currencySymbol: string };
  onSubmit: (exclusion: SubmitExclusion) => void;
  className?: string;
}

const LossBlock: React.FC<Props> = ({
  timeLimits,
  currency,
  className,
  onSubmit
}) => {
  const { Button, Field, TextInput, Select } = useRegistry();
  const CoinIcon = getCoinIcon(currency.currencyISO);

  const messages = useMessages({
    lossLimit: "my-account.self-exclusion.loss-limit",
    description: "my-account.self-exclusion.loss-limit.description",
    limitPlaceholder: "my-account.self-exclusion.loss-limit.placeholder",
    lossLimitError: "my-account.self-exclusion.loss-limit.error",
    perDay: "selfexclusion.per-day",
    perWeek: "selfexclusion.per-week",
    perMonth: "selfexclusion.per-month"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      limitValue: yup.string().required().label(messages.lossLimitError),
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
    <StyledLossBlock className={className}>
      <div className="loss-block__title">{messages.lossLimit}</div>
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
                <div className="loss-block__description">
                  {messages.description}
                </div>
                <div className="loss-block__fields">
                  <Field name="limitValue">
                    <TextInput
                      className="loss-block__input"
                      placeholder={messages.limitPlaceholder}
                      rightIcon={<CoinIcon />}
                      type="number"
                      pattern="^[0-9]*$"
                    />
                  </Field>
                  <div className="loss-block__space" />
                  <Field name="limitPeriodType">
                    <Select className="loss-block__select">
                      <option value="daily">{messages.perDay}</option>
                      <option value="weekly">{messages.perWeek}</option>
                      <option value="monthly">{messages.perMonth}</option>
                    </Select>
                  </Field>
                </div>
                <div className="loss-block__buttons">
                  {timeLimits.map(limit => (
                    <Button
                      type="button"
                      className="loss-block__button"
                      key={limit.time}
                      color={Button.Color.primaryLightest}
                      size={Button.Size.small}
                      disabled={!form.values.limitValue}
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
    </StyledLossBlock>
  );
};

export default LossBlock;
