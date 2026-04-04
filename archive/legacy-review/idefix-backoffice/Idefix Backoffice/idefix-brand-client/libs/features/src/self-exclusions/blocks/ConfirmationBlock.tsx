import * as React from "react";
import styled from "styled-components";
import { useRegistry } from "@brandserver-client/ui";
import {
  useMessages,
  useLimitPeriodTranslation
} from "@brandserver-client/hooks";
import {
  SubmitExclusion,
  LimitLengthWithText
} from "@brandserver-client/types";

const StyledConfirmationBlock = styled.div`
  .confirm-block__warning-text,
  .confirm-block__approve-text {
    ${({ theme }) => theme.typography.text16};
    color: ${p => p.theme.palette.error};
  }

  .confirm-block__warning-text {
    margin-bottom: 7px;
  }

  .confirm-block__approve-text {
    margin-bottom: 20px;
  }

  .confirm-block__value {
    ${({ theme }) => theme.typography.text16Bold};
  }

  .confirm-block__buttons {
    display: flex;
    justify-content: space-between;
  }

  .confirm-block__button-confirm {
    width: 152px;
  }
`;

interface Props {
  exclusion: SubmitExclusion;
  cancel: () => void;
  submit?: () => void;
  className?: string;
  currencySymbol?: string;
  timeLimits?: LimitLengthWithText[];
}

const ConfirmationBlock: React.FC<Props> = ({
  exclusion: { limitPeriodType, limitType, limitValue, limitLength },
  submit,
  cancel,
  className,
  currencySymbol,
  timeLimits
}) => {
  const { Button } = useRegistry();
  const messages = useMessages({
    lossApprove: "my-account.self-exclusion.loss-limit.approve",
    lossWarning: "my-account.self-exclusion.loss-limit.warning",
    depositApprove: "my-account.self-exclusion.deposit-limit.approve",
    depositWarning: "my-account.self-exclusion.deposit-limit.warning",
    confirmationYes: "selfexclusion.confirmation.yes",
    confirmationNo: "selfexclusion.confirmation.no",
    playtimeApprove: "my-account.self-exclusion.playtime-limit.approve",
    playtimeWarning: "my-account.self-exclusion.playtime-limit.warning",
    hours: "selfexclusion.confirmation.hours",
    session: "selfexclusion.confirmation.session",
    timeoutApprove: "my-account.self-exclusion.timeout-limit.approve",
    timeoutWarning: "my-account.self-exclusion.timeout-limit.warning",
    gamePauseApprove: "my-account.self-exclusion.game-pause.approve",
    gamePauseWarning: "my-account.self-exclusion.game-pause.warning"
  });

  const limitPeriodTranslation = useLimitPeriodTranslation(limitPeriodType);

  const getWarningText = () => {
    switch (limitType) {
      case "loss":
        return messages.lossWarning;
      case "deposit":
        return messages.depositWarning;
      case "play":
        return messages.playtimeWarning;
      case "timeout":
        return messages.timeoutWarning;
      case "pause":
        return messages.gamePauseWarning;
    }
  };

  const getApproveText = () => {
    switch (limitType) {
      case "loss":
        return messages.lossApprove;
      case "deposit":
        return messages.depositApprove;
      case "play":
        return messages.playtimeApprove;
      case "timeout":
        return messages.timeoutApprove;
      case "pause":
        return messages.gamePauseApprove;
    }
  };

  const getConfirmationValue = () => {
    switch (limitType) {
      case "loss":
      case "deposit": {
        return `${limitValue}${currencySymbol}/${limitPeriodTranslation}`;
      }
      case "play":
        return `${limitValue} ${messages.hours}/${messages.session}`;
      case "timeout":
      case "pause": {
        if (timeLimits) {
          const value = timeLimits.find(
            timeLimit => timeLimit.time === limitLength
          );
          return value ? value.message : "";
        }
      }
    }
  };

  return (
    <StyledConfirmationBlock className={className}>
      <div className="confirm-block__warning-text">{getWarningText()}</div>
      <div className="confirm-block__approve-text">
        {getApproveText()}{" "}
        <span className="confirm-block__value">{getConfirmationValue()}</span>
      </div>
      <div className="confirm-block__buttons">
        <Button
          type="submit"
          color={Button.Color.primaryLightest}
          size={Button.Size.small}
          className="confirm-block__button-confirm"
          onClick={submit}
        >
          {messages.confirmationYes}
        </Button>
        <Button
          type="button"
          color={Button.Color.primaryLightest}
          size={Button.Size.small}
          className="confirm-block__button-confirm"
          onClick={cancel}
        >
          {messages.confirmationNo}
        </Button>
      </div>
    </StyledConfirmationBlock>
  );
};

export default ConfirmationBlock;
