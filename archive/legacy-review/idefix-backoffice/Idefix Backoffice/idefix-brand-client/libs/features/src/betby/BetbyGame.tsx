import * as React from "react";
import cn from "classnames";
import styled from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";
import { useIsLoggedIn } from "@brandserver-client/hooks";
import { useIsBetby } from "./hooks/useIsBetby";
import { useBetbyGame } from "./hooks/useBetbyGame";
import { useRefreshBalance } from "./hooks/useRefreshBalance";
import { useBetbyNotifications } from "./hooks/useBetbyNotifications";
import { BetbyFrame } from "./BetbyFrame";

const BetbyGame: React.FC = () => {
  const isLoggedIn = useIsLoggedIn();
  const isBetby = useIsBetby();

  const gameOptions = useBetbyGame(isLoggedIn);

  useBetbyNotifications();
  useRefreshBalance(isLoggedIn, isBetby);

  return (
    <StyledBetbyGame
      className={cn({
        "betby-game--active": isBetby,
        "betby-game--nonloggedin": !isLoggedIn
      })}
    >
      {gameOptions && <BetbyFrame startGameOptions={gameOptions} />}
    </StyledBetbyGame>
  );
};

const StyledBetbyGame = styled.div`
  display: none;
  height: calc(100vh - 80px - 44px);

  &.betby-game--active {
    display: block;
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    height: calc(
      100vh - 60px - 44px - max(80px, calc(80px + env(safe-area-inset-bottom)))
    );
  }

  @media (orientation: landscape) and ${({ theme }) =>
      theme.breakpoints.down(Breakpoints.tablet)} {
    height: calc(
      100vh - 60px - 44px - max(56px, calc(56px + env(safe-area-inset-bottom)))
    );
  }

  &.betby-game--nonloggedin {
    padding-top: 80px;
    height: calc(100vh - 44px);

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      height: calc(
        100vh - 44px - max(80px, calc(80px + env(safe-area-inset-bottom)))
      );
    }

    @media (orientation: landscape) and ${({ theme }) =>
        theme.breakpoints.down(Breakpoints.tablet)} {
      height: calc(
        100vh - 44px - max(56px, calc(56px + env(safe-area-inset-bottom)))
      );
    }
  }
`;

export { BetbyGame };
