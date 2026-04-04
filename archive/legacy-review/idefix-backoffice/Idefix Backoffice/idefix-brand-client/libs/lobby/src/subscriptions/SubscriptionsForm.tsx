import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import styled from "styled-components";
import cn from "classnames";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";
import { FormValues, PromotionType } from "./types";

const StyledSubscriptionsForm = styled(Form)`
  margin-bottom: 25px;

  &.SubscriptionsForm--loggedin {
    .SubscriptionsForm__submit {
      @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
        max-width: 100%;
      }
    }

    h2 {
      ${({ theme }) => theme.typography.text21BoldUpper};
    }
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    margin-bottom: 33px;
  }

  h2 {
    ${({ theme }) => theme.typography.text18Bold};
    color: ${({ theme }) => theme.palette.primary};
  }

  .SubscriptionsForm__subtitle {
    margin: 19px 0 21px 0;
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
  }

  .SubscriptionsForm__email-label {
    margin: 20px 0 1px;
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
  }

  .SubscriptionsForm__email-value {
    margin: 0 0 20px;
    ${({ theme }) => theme.typography.text16Bold};
    color: ${({ theme }) => theme.palette.accent};
  }

  .SubscriptionsForm__option {
    margin-top: 21px;
  }

  .SubscriptionsForm__input {
    .radio-field__label {
      ${({ theme }) => theme.typography.text16Bold};
      color: ${({ theme }) => theme.palette.contrastLight};
    }
  }

  .SubscriptionsForm__description {
    margin: 7px 0 0 28px;
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrast};
  }

  .SubscriptionsForm__submit {
    margin-top: 32px;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      margin-top: 40px;
      max-width: 50%;
    }
  }
`;

interface Props {
  initialValues: FormValues;
  promotionType: PromotionType;
  onSubmit: (
    values: FormValues,
    formikActions: FormikHelpers<FormValues>
  ) => void;
  email?: string;
  loggedin?: boolean;
}

const SubscriptionsForm: React.FC<Props> = ({
  initialValues,
  email,
  promotionType,
  loggedin,
  onSubmit
}) => {
  const { RadioField, Button } = useRegistry();

  const fieldName = React.useMemo(
    () => (promotionType === "email" ? "emails" : "smses"),
    [promotionType]
  );

  const messages = useMessages({
    newsletterHeader: "subscriptions.newsletter.heading",
    newsletterDescription: "subscriptions.newsletter.description",
    smsHeading: "subscriptions.sms.heading",
    smsDescription: "subscriptions.sms.option.snoozed.description",
    email: "subscriptions.newsletter.email",
    allOptionLabel: "subscriptions.option.all.label",
    allOptionDescription: "subscriptions.option.all.description",
    bestOptionLabel: "subscriptions.option.best.label",
    bestOptionDescription: "subscriptions.option.best.description",
    newOptionLabel: "subscriptions.option.new.label",
    newOptionDescription: "subscriptions.option.new.description",
    snoozedOptionLabel: "subscriptions.option.snoozed.label",
    newsletterSnoozedOptionDescription:
      "subscriptions.newsletter.option.snoozed.description",
    smsSnoozedOptionDescription: "subscriptions.sms.option.snoozed.description",
    unsubscribedOptionLabel: "subscriptions.option.unsubscribed.label",
    unsubscribedOptionDescription:
      "subscriptions.option.unsubscribed.description",
    updateAction: "subscriptions.action.update"
  });

  return (
    <Formik onSubmit={onSubmit} initialValues={initialValues}>
      {formik => (
        <StyledSubscriptionsForm
          className={cn({ "SubscriptionsForm--loggedin": !!loggedin })}
        >
          <h2>
            {promotionType === "email"
              ? messages.newsletterHeader
              : messages.smsHeading}
          </h2>
          {!!email && !loggedin && (
            <>
              <p className="SubscriptionsForm__email-label">
                {messages.email}:
              </p>
              <p className="SubscriptionsForm__email-value">{email}</p>
            </>
          )}

          <p className="SubscriptionsForm__subtitle">
            {promotionType === "email"
              ? messages.newsletterDescription
              : messages.smsDescription}
          </p>
          <div className="SubscriptionsForm__option">
            <RadioField
              name={fieldName}
              value="all"
              className="SubscriptionsForm__input"
            >
              {messages.allOptionLabel}
            </RadioField>
            <p className="SubscriptionsForm__description">
              {messages.allOptionDescription}
            </p>
          </div>

          <div className="SubscriptionsForm__option">
            <RadioField
              name={fieldName}
              value="new_games"
              className="SubscriptionsForm__input"
            >
              {messages.newOptionLabel}
            </RadioField>
            <p className="SubscriptionsForm__description">
              {messages.newOptionDescription}
            </p>
          </div>

          <div className="SubscriptionsForm__option">
            <RadioField
              name={fieldName}
              value="best_offers"
              className="SubscriptionsForm__input"
            >
              {messages.bestOptionLabel}
            </RadioField>
            <p className="SubscriptionsForm__description">
              {messages.bestOptionDescription}
            </p>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          {formik.values[fieldName] === "snoozed" && (
            <div className="SubscriptionsForm__option">
              <RadioField
                name={fieldName}
                value="snoozed"
                className="SubscriptionsForm__input"
              >
                {messages.snoozedOptionLabel}
              </RadioField>
              <p className="SubscriptionsForm__description">
                {messages.newsletterSnoozedOptionDescription}
              </p>
            </div>
          )}
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          {formik.values[fieldName] === "none" && (
            <div className="SubscriptionsForm__option">
              <RadioField
                name={fieldName}
                value="none"
                className="SubscriptionsForm__input"
              >
                {messages.unsubscribedOptionLabel}
              </RadioField>
              <p className="SubscriptionsForm__description">
                {messages.unsubscribedOptionDescription}
              </p>
            </div>
          )}

          <Button
            color={Button.Color.accent}
            disabled={!formik.dirty || formik.isSubmitting}
            type="submit"
            className="SubscriptionsForm__submit"
          >
            {messages.updateAction}
          </Button>
        </StyledSubscriptionsForm>
      )}
    </Formik>
  );
};

export default SubscriptionsForm;
