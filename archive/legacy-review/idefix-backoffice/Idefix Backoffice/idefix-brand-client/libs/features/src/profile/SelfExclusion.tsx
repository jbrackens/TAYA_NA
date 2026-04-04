import React from "react";
import Link from "next/link";
import styled from "styled-components";
import { useRegistry } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";

const StyledSelfExclusion = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .self-exclusion__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.primary};
    margin-bottom: 16px;
  }

  .self-exclusion__choise-text {
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
  }

  .self-exclusion__button {
    width: 100%;
    margin-top: 18px;
  }
`;

interface Props {
  className?: string;
}

const SelfExclusion: React.FC<Props> = ({ className }) => {
  const messages = useMessages({
    title: "selfexclusion.title",
    content: "selfexclusion.content"
  });

  const { Button } = useRegistry();

  return (
    <StyledSelfExclusion className={className}>
      <div className="self-exclusion__title">{messages.title}</div>
      <div className="self-exclusion__choise-text">{messages.content}</div>
      <Link
        href="/loggedin/myaccount/player-protection"
        as="/loggedin/myaccount/player-protection"
      >
        <a className="self-exclusion__button">
          <Button
            color={Button.Color.primaryLightest}
            size={Button.Size.large}
            tabIndex={-1}
          >
            {messages.title}
          </Button>
        </a>
      </Link>
    </StyledSelfExclusion>
  );
};

export default SelfExclusion;
