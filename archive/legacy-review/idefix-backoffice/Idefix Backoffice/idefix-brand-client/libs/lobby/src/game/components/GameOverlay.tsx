import React, { ReactNode } from "react";
import cn from "classnames";
import styled from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";
import { isLandscapeOrientation } from "@brandserver-client/utils";
import { useSelector } from "react-redux";
import { getPlayer, getMobile } from "../../app";
import { use100vh } from "react-div-100vh";

const StyledGameOverlay = styled.div<{
  height: number | null;
  isMobile: boolean;
}>`
  height: 100%;
  box-sizing: border-box;
  /* This is made to hide footer, because game height could be smaller than screen height */
  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    background: ${({ theme }) => theme.palette.primaryDark};
    padding-bottom: 100px;
  }
  .overlay {
    width: 100vw;
    overflow: auto;
    background-color: ${({ theme }) => theme.palette.primaryDark};
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
    height: ${({ height, isMobile }) => getOverlayHeight(height, isMobile)};
  }
  .overlay__nonloggedin {
    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      margin-top: 80px;
    }
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      padding-top: 80px;
    }
  }
  .GameOverlay__game-wrapper {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

interface Props {
  children: ReactNode;
  nonloggedin?: boolean;
}

function getOverlayHeight(height: number | null, isMobile: boolean): string {
  if (!isMobile || !height) {
    // initial value
    return `calc(100vh - 80px)`;
  }

  if (!isLandscapeOrientation()) {
    // height - (mobile footer height + safe-area-inset-bottom)
    return `calc(${height}px - max(80px, calc(80px + env(safe-area-inset-bottom))))`;
  }
  // height - (mobile footer height when screen orientation is landscape + safe-area-inset-bottom)
  return `calc(${height}px - max(56px, calc(56px + env(safe-area-inset-bottom))))`;
}

const GameOverlay: React.FC<Props> = ({ children }) => {
  const isMobile = useSelector(getMobile);
  const player = useSelector(getPlayer);

  // TODO: change game height depending if browser toolbars are visible
  const height = use100vh();

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <StyledGameOverlay height={height} isMobile={isMobile}>
      <div
        className={cn("overlay", {
          overlay__nonloggedin: player.FirstName === ""
        })}
      >
        <div className="GameOverlay__game-wrapper">{children}</div>
      </div>
    </StyledGameOverlay>
  );
};

export { GameOverlay };
