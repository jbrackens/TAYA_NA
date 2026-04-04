import React from "react";
import Link from "next/link";
import styled from "styled-components";
import { useRegistry } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";

const StyledSubscriptions = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-top: 34px;

  .Subscriptions__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.primary};
    margin-bottom: 16px;
  }

  .Subscriptions__description {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
  }

  .Subscriptions__button {
    margin-top: 18px;
  }
`;

const Subscriptions = () => {
  const { Button } = useRegistry();

  const messages = useMessages({
    title: "my-account.my-profile.my-subscriptions.heading",
    description: "my-account.my-profile.my-subscriptions.description",
    action: "my-account.my-profile.my-subscriptions.action"
  });

  return (
    <StyledSubscriptions>
      <div className="Subscriptions__title">{messages.title}</div>
      <div className="Subscriptions__description">{messages.description}</div>
      <Link
        href="/loggedin/myaccount/subscriptions"
        as="/loggedin/myaccount/subscriptions"
      >
        <a className="Subscriptions__button">
          <Button
            color={Button.Color.primaryLightest}
            size={Button.Size.large}
            tabIndex={-1}
          >
            {messages.action}
          </Button>
        </a>
      </Link>
    </StyledSubscriptions>
  );
};

export default Subscriptions;
