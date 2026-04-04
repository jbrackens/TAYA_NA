import * as React from "react";
import styled from "styled-components";
import Link from "next/link";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { EnterCash } from "./EnterCash";

const StyledWithdrawActivation = styled.div`
  .withdraw__kyc-activation-info-title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.primary};
    margin-bottom: 16px;
  }

  .withdraw__kyc-activation-info-text {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrastDark};
    margin-bottom: 40px;
  }

  .withdraw__kyc-actions-bank-verify {
    display: flex;
    flex-wrap: wrap;

    button {
      margin-right: 32px;
      margin-bottom: 32px;
    }
  }

  .common-button {
    margin-bottom: 24px;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      width: 324px;
    }
  }
`;

interface Props {
  action?: {
    href: string;
    as: string;
  };
  titleFormattedMessage?: string;
  infoFormattedMessage: string;
  activationSend?: boolean;
  methods?: any;
  onActivationSend?: () => void;
  onBankIdentify?: (id: string) => void;
}

const WithdrawActivation: React.FC<Props> = ({
  action,
  titleFormattedMessage,
  infoFormattedMessage,
  activationSend,
  methods,
  onBankIdentify,
  onActivationSend
}) => {
  const messages = useMessages({
    title: titleFormattedMessage || "",
    info: infoFormattedMessage,
    action: "my-account.withdraw.kyc.action",
    resend: "my-account.resend-activation",
    verify: "my-account.withdraw.kyc.verify-button"
  });

  const { Button } = useRegistry();

  return (
    <StyledWithdrawActivation>
      {titleFormattedMessage && (
        <div className="withdraw__kyc-activation-info-title">
          {messages.title}
        </div>
      )}
      <div className="withdraw__kyc-activation-content">
        <div className="withdraw__kyc-activation-info">
          <div
            className="withdraw__kyc-activation-info-text"
            dangerouslySetInnerHTML={{ __html: messages.info }}
          ></div>
          <div className="withdraw__kyc-activation-info-actions">
            {methods &&
              onBankIdentify &&
              (methods.length === 1 ? (
                <Button
                  color={Button.Color.accent}
                  className="withdraw__kyc-actions-info-actions-read-more common-button"
                  onClick={() => onBankIdentify(methods[0].id)}
                >
                  {messages.verify}
                </Button>
              ) : (
                <EnterCash options={methods} handleClick={onBankIdentify} />
              ))}
            {!!action && (
              <Link {...action}>
                <Button
                  color={Button.Color.accent}
                  className="withdraw__kyc-actions-info-actions-read-more common-button"
                >
                  {messages.action}
                </Button>
              </Link>
            )}
            {!activationSend && onActivationSend && (
              <Button
                color={Button.Color.accent}
                className="withdraw__kyc-actions-info-actions-send-link common-button"
                onClick={onActivationSend}
              >
                {messages.resend}
              </Button>
            )}
          </div>
        </div>
      </div>
    </StyledWithdrawActivation>
  );
};

export default WithdrawActivation;
