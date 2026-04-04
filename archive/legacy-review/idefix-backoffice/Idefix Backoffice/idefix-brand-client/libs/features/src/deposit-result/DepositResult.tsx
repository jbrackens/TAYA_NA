import React, { FC } from "react";
import styled from "styled-components";
import cn from "classnames";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { DepositFailure, DepositSuccess } from "@brandserver-client/icons";
import { FormattedMessage } from "react-intl";
import { useMessages } from "@brandserver-client/hooks";
import Link from "next/link";

enum Status {
  success = "success",
  failure = "failure"
}

interface Props {
  status: Status;
  titleId: string;
  buttonMessageId: string;
  href: string;
  as: string;
  subtitleId?: string;
}

const Icons = {
  [Status.failure]: DepositFailure,
  [Status.success]: DepositSuccess
};

const StyledDepositResult = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  color: ${({ theme }) => theme.palette.primary};
  text-align: center;

  a {
    color: ${({ theme }) => theme.palette.accent};
    font-weight: bold;
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    max-width: 324px;
    width: 100%;
  }

  .deposit-result__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      height: auto;
    }
  }

  .deposit-result__title {
    margin-top: 30px;
    ${({ theme }) => theme.typography.text21BoldUpper};
  }

  .deposit-result__title--failure {
    color: ${({ theme }) => theme.palette.error};
  }

  .deposit-result__subtitle {
    margin-top: 10px;
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrastDark};
  }

  .deposit-result__button {
    margin-bottom: 15px;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      margin-top: 24px;
    }
  }
`;

const DepositResult: FC<Props> & {
  Status: typeof Status;
} = ({ status, titleId, buttonMessageId, href, as, subtitleId }) => {
  const { Button } = useRegistry();

  const messages = useMessages({
    title: titleId,
    button: buttonMessageId
  });

  const DepositResultIcon = Icons[status];

  return (
    <StyledDepositResult>
      <div className="deposit-result__content">
        <DepositResultIcon />
        <span
          className={cn("deposit-result__title", {
            "deposit-result__title--failure": status === Status.failure
          })}
        >
          {messages.title}
        </span>
        {subtitleId && (
          <FormattedMessage id={subtitleId}>
            {(msg: any) => (
              <span
                className="deposit-result__subtitle"
                dangerouslySetInnerHTML={{ __html: msg }}
              />
            )}
          </FormattedMessage>
        )}
      </div>

      <Link href={href} as={as}>
        <Button
          color={Button.Color.accent}
          size={Button.Size.large}
          className="deposit-result__button"
        >
          {messages.button}
        </Button>
      </Link>
    </StyledDepositResult>
  );
};

DepositResult.Status = Status;

export { DepositResult };
