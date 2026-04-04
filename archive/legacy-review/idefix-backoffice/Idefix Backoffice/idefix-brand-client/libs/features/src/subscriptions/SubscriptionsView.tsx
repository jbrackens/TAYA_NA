import * as React from "react";
import styled from "styled-components";
import { SubscriptionV2 } from "@brandserver-client/types";
import { Breakpoints } from "@brandserver-client/ui";
import { Subscriptions } from "@brandserver-client/lobby";

const StyledMyAccountSubscriptions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
  }

  .MyAccountSubscriptions__column {
    max-width: 324px;
    width: 100%;

    &:last-child {
      margin-top: 42px;
      margin-bottom: 24px;
    }

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      &:last-child {
        margin: 0;
      }
    }
  }
`;

interface IProps {
  subscription: SubscriptionV2;
}

const SubscriptionsView: React.FC<IProps> = ({ subscription }) => (
  <StyledMyAccountSubscriptions>
    <div className="MyAccountSubscriptions__column">
      <Subscriptions
        subscription={subscription}
        promotionType="email"
        loggedin={true}
      />
    </div>
    <div className="MyAccountSubscriptions__column">
      <Subscriptions
        subscription={subscription}
        promotionType="sms"
        loggedin={true}
      />
    </div>
  </StyledMyAccountSubscriptions>
);

export default SubscriptionsView;
