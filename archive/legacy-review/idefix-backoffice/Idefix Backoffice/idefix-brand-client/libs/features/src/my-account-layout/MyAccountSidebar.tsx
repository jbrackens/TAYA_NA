import * as React from "react";
import { useRouter } from "next/router";
import styled from "styled-components";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import { MyAccountLink } from "@brandserver-client/lobby";
import { useMessages, useLogout } from "@brandserver-client/hooks";
import NavigationLink from "./NavigationLink";

const StyledMyAccountSidebar = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  max-width: 248px;
  background-color: ${({ theme }) => theme.palette.primary};
  display: flex;
  flex-direction: column;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    display: none;
  }

  .myaccount-sidebar__button-wrapper {
    padding: 36px 28px 14px;

    button {
      color: ${({ theme }) => theme.palette.contrast};
      background-color: ${({ theme }) => theme.palette.accent2};
    }
  }

  .myaccount-sidebar__logout-link--vb {
    position: absolute;
    bottom: 96px;
  }

  .myaccount-sidebar__logout-link--sn {
    position: absolute;
    bottom: 78px;
  }

  .myaccount-sidebar__logout-link {
    position: absolute;
    bottom: 16px;
  }
`;

interface IProps {
  sidebarLinks: MyAccountLink[];
}

export const MyAccountSidebar: React.FC<IProps> = ({ sidebarLinks }) => {
  const router = useRouter();
  const logout = useLogout();

  const { Button } = useRegistry();

  const handlePush = React.useCallback(
    () => router.push("/loggedin/myaccount/deposit"),
    []
  );

  const handleLiveAgentClick = React.useCallback(() => {
    if ((window as any).chatButton) {
      (window as any).chatButton.onClick();
    }
  }, []);

  const getOnClickHandler = (href: string) => {
    switch (href) {
      case "/logout":
        return logout;
      case "/loggedin/myaccount/support":
        return handleLiveAgentClick;
      default:
        return undefined;
    }
  };

  const sidebarNavigationLinks = sidebarLinks.map(
    ({ href, badge, Icon, text, className }) => {
      if (href.includes("withdraw-pending") && !badge) {
        return null;
      }

      return (
        <NavigationLink
          icon={<Icon />}
          href={href}
          key={href}
          badge={badge}
          className={className}
          onClick={getOnClickHandler(href)}
        >
          {text}
        </NavigationLink>
      );
    }
  );

  const messages = useMessages({
    deposit: "my-account.cashier.deposit"
  });

  return (
    <StyledMyAccountSidebar>
      <div className="myaccount-sidebar__button-wrapper">
        <Button color={Button.Color.accent2} onClick={handlePush}>
          {messages.deposit}
        </Button>
      </div>

      <ul>{sidebarNavigationLinks}</ul>
    </StyledMyAccountSidebar>
  );
};
