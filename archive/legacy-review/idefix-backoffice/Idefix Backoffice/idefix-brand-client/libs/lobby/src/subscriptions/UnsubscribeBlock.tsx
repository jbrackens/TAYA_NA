import * as React from "react";
import styled from "styled-components";
import cn from "classnames";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { ArrowLeftIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";
import { Step, PromotionType } from "./types";

interface Props {
  unsubscribed: boolean;
  snoozed: boolean;
  step: Step;
  promotionType: PromotionType;
  loggedin?: boolean;
  onSetStep: React.Dispatch<React.SetStateAction<Step>>;
  onSnoozeSubscription: () => Promise<void>;
  onUnsubscribe: () => Promise<void>;
  onResubscribe: () => Promise<void>;
}

const StyledUnsubscribeBlock = styled.div`
  position: relative;

  &.UnsubscribeBlock--text-center {
    text-align: center;
  }

  /* Styles needed in loggedin mode */
  &.UnsubscribeBlock--loggedin {
    .UnsubscribeBlock__actions {
      @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
        flex-direction: column !important;
      }
    }

    .UnsubscribeBlock__link-button.UnsubscribeBlock__link-button--red.UnsubscribeBlock__link-button--desktop.UnsubscribeBlock__unsubscribe-button {
      display: none;
    }

    .UnsubscribeBlock__link-button.UnsubscribeBlock__link-button--top.UnsubscribeBlock__link-button--desktop {
      display: none;
    }

    .UnsubscribeBlock__unsubscribe-button {
      @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
        flex: 1;
        text-align: center;
        margin: 25px 0 0;
      }
    }

    .UnsubscribeBlock__footer-actions {
      @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
        display: flex;
      }
    }

    h2 {
      ${({ theme }) => theme.typography.text21BoldUpper};
    }
  }

  h2 {
    ${({ theme }) => theme.typography.text18Bold};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
  }

  p {
    margin: 18px 0 32px;
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrast};

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      margin: 18px 0 40px;
    }
  }

  .UnsubscribeBlock__actions {
    display: flex;
    flex-direction: column;
    margin-top: 32px;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      flex-direction: row;
    }
  }

  .UnsubscribeBlock__link-button {
    ${({ theme }) => theme.typography.text18Bold};
    color: ${({ theme }) => theme.palette.secondaryDarkest};

    &:hover {
      cursor: pointer;
    }

    &--red {
      color: ${({ theme }) => theme.palette.error};
    }

    &--top {
      display: flex;
      align-items: center;
      position: absolute;
      top: 0;
      left: 0;

      & > svg {
        margin-right: 11px;
      }
    }

    &--desktop {
      display: none;

      @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
        display: flex;
      }
    }
  }

  .UnsubscribeBlock__snooze-button {
    flex: 1;
  }

  .UnsubscribeBlock__resubscribe-button {
    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      max-width: 280px;
      margin: 0 auto;
    }
  }

  .UnsubscribeBlock__unsubscribe-button {
    flex: 1;
    text-align: center;
    margin: 25px 0 0;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      justify-content: center;
      align-self: center;
      margin: 0;
    }
  }

  .UnsubscribeBlock__footer-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 25px;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      display: none;
    }
  }
`;

const UnsubscribeBlock: React.FC<Props> = ({
  unsubscribed,
  snoozed,
  step,
  promotionType,
  loggedin,
  onSetStep,
  onSnoozeSubscription,
  onUnsubscribe,
  onResubscribe
}) => {
  const { Button } = useRegistry();

  const messages = useMessages({
    newsletterUnsubscribeTitle: "subscriptions.newsletter.unsubscribe.heading",
    newsletterUnsubscribeDescription:
      "subscriptions.newsletter.unsubscribe.description",
    smsUnsubscribeTitle: "subscriptions.sms.unsubscribe.heading",
    smsUnsubscribeDescription: "subscriptions.sms.unsubscribe.description",
    snoozeAction: "subscriptions.action.snooze",
    unsubscribeAction: "subscriptions.action.unsubscribe",
    backAction: "subscriptions.action.back",
    unsubscribeFromNews: "subscriptions.newsletter.unsubscribe.action",
    unsubscribeFromSms: "subscriptions.sms.unsubscribe.action",
    confirmationHeading: "subscriptions.unsubscribe.confirmation.heading",
    newsletterSnoozeDescription: "subscriptions.newsletter.snooze.description",
    smsSnoozeDescription: "subscriptions.sms.snooze.description",
    snoozedHeading: "subscriptions.snoozed.heading",
    newsletterSnoozedDescription:
      "subscriptions.newsletter.snoozed.description",
    smsSnoozedDescription: "subscriptions.sms.snoozed.description",
    unsubscribedHeading: "subscriptions.unsubscribed.heading",
    unsubscribedDescription: "subscriptions.unsubscribed.description",
    resubscribeAction: "subscriptions.action.resubscribe"
  });

  return (
    <StyledUnsubscribeBlock
      className={cn({
        "UnsubscribeBlock--loggedin": !!loggedin,
        "UnsubscribeBlock--text-center": step !== Step.Subscriptions
      })}
    >
      {step === Step.Subscriptions && !snoozed && !unsubscribed && (
        <React.Fragment>
          <h2>
            {promotionType === "email"
              ? messages.newsletterUnsubscribeTitle
              : messages.smsUnsubscribeTitle}
          </h2>
          <p>
            {promotionType === "email"
              ? messages.newsletterUnsubscribeDescription
              : messages.smsUnsubscribeDescription}
          </p>
          <div className="UnsubscribeBlock__actions">
            <Button
              className="UnsubscribeBlock__snooze-button"
              color={Button.Color.accent}
              onClick={() => onSetStep(Step.Confirmation)}
            >
              {messages.snoozeAction}
            </Button>
            <a
              className="UnsubscribeBlock__link-button UnsubscribeBlock__unsubscribe-button"
              onClick={() => onSetStep(Step.Confirmation)}
            >
              {promotionType === "email"
                ? messages.unsubscribeFromNews
                : messages.unsubscribeFromSms}
            </a>
          </div>
        </React.Fragment>
      )}
      {step === Step.Confirmation && (
        <React.Fragment>
          <h2>{messages.confirmationHeading}</h2>
          <p>
            {promotionType === "email"
              ? messages.newsletterSnoozeDescription
              : messages.smsSnoozeDescription}
          </p>
          <div className="UnsubscribeBlock__actions">
            <Button
              className="UnsubscribeBlock__snooze-button"
              color={Button.Color.accent}
              onClick={() => onSnoozeSubscription()}
            >
              {messages.snoozeAction}
            </Button>
            <a
              className="UnsubscribeBlock__link-button UnsubscribeBlock__link-button--red UnsubscribeBlock__link-button--desktop UnsubscribeBlock__unsubscribe-button"
              onClick={onUnsubscribe}
            >
              {messages.unsubscribeAction}
            </a>
          </div>
          <div className="UnsubscribeBlock__footer-actions">
            <a
              className="UnsubscribeBlock__link-button"
              onClick={() => onSetStep(Step.Subscriptions)}
            >
              {messages.backAction}
            </a>
            <a
              className="UnsubscribeBlock__link-button UnsubscribeBlock__link-button--red"
              onClick={onUnsubscribe}
            >
              {messages.unsubscribeAction}
            </a>
          </div>
          <a
            className="UnsubscribeBlock__link-button UnsubscribeBlock__link-button--top UnsubscribeBlock__link-button--desktop"
            onClick={() => onSetStep(Step.Subscriptions)}
          >
            <ArrowLeftIcon /> {messages.backAction}
          </a>
        </React.Fragment>
      )}
      {step === Step.Result && (
        <React.Fragment>
          <h2>
            {snoozed ? messages.snoozedHeading : messages.unsubscribedHeading}
          </h2>
          <p>
            {snoozed &&
              promotionType === "email" &&
              messages.newsletterSnoozedDescription}
            {snoozed &&
              promotionType === "sms" &&
              messages.smsSnoozedDescription}
            {unsubscribed && messages.unsubscribedDescription}
          </p>
          <Button
            className="UnsubscribeBlock__resubscribe-button"
            color={Button.Color.accent}
            onClick={onResubscribe}
          >
            {messages.resubscribeAction}
          </Button>
        </React.Fragment>
      )}
    </StyledUnsubscribeBlock>
  );
};

export default UnsubscribeBlock;
