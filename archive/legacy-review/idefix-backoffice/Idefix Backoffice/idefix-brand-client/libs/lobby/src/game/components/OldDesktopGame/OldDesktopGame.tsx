import { useClientRect } from "@brandserver-client/hooks";
import { CloseIcon } from "@brandserver-client/icons";
import { StartGameOptions } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import cn from "classnames";
import { useRouter } from "next/router";
import * as React from "react";
import styled from "styled-components";
import { Dimensions, useDimensions } from "./hooks/useDimensions";
import { getAspectRatio } from "./utils/getAspectRatio";

interface StyledProps {
  dimensions: Dimensions;
  gameSizeIsEqualWithDialogSize?: boolean;
}

const StyledOldDesktopGame = styled.div<StyledProps>`
  width: calc(100% - 120px);
  height: calc(100% - 48px);
  margin: 24px 60px;

  display: flex;
  justify-content: center;
  align-items: center;

  .desktop-game__game-container {
    position: relative;
    display: flex;
    align-items: center;

    flex-shrink: 0;
    width: ${props => props.dimensions.dialogWidth}px;
    height: ${props => props.dimensions.dialogHeight}px;
    transition: width 0.4s ease, height 0.4s ease, transform 0.4s ease;

    background: transparent;

    border-bottom-right-radius: 8px;
  }

  .desktop-game__game-container--visible {
    transition: ${({ gameSizeIsEqualWithDialogSize }) =>
      gameSizeIsEqualWithDialogSize
        ? "width 0.4s ease, height 0.4s ease, transform 0.4s ease"
        : "width 0.4s ease 0.5s, height 0.4s ease 0.5s, transform 0.4s ease"};
    transform: none;
  }

  .desktop-game__game-container--hidden {
    width: ${props => props.dimensions.gameWidth}px;
    height: ${props => props.dimensions.gameHeight}px;
    transform: ${props =>
      `scale(${
        props.dimensions.fullScreenDimensions.gameWidth /
        props.dimensions.gameWidth
      })`};

    transition: width 0.4s ease, height 0.4s ease, transform 0.4s ease 0.5s;
  }

  .desktop-game__game {
    width: ${props => props.dimensions.gameWidth}px;
    height: ${props => props.dimensions.gameHeight}px;
    background: transparent;
    color: white;
    position: relative;
    z-index: 1000;
    transition: ${({ gameSizeIsEqualWithDialogSize }) =>
      gameSizeIsEqualWithDialogSize
        ? "width 0.4s ease, height 0.4s ease, transform 0.4s ease"
        : "width 0.4s ease 0.5s, height 0.4s ease 0.5s, transform 0.4s ease"};
    & div:not(.loader-c div) {
      width: inherit;
      height: inherit;
    }
    & iframe {
      width: inherit;
      height: inherit;
    }
  }

  .desktop-game__close-button {
    margin-left: 8px;
    margin-bottom: auto;
  }
`;

interface Props {
  startGameOptions: StartGameOptions;
}

const OldDesktopGame: React.FC<Props> = ({ startGameOptions }) => {
  const { push } = useRouter();
  const { IconButton } = useRegistry();

  const container = React.useRef<HTMLDivElement>(null);
  const { width: containerWidth, height: containerHeight } =
    useClientRect(container);

  const aspectRatio = getAspectRatio(
    startGameOptions && startGameOptions.Options
  );

  const dimensions = useDimensions({
    overlayWidth: containerWidth,
    overlayHeight: containerHeight,
    aspectRatio
  });

  const gameSizeIsEqualWithDialogSize =
    dimensions.gameWidth === dimensions.fullScreenDimensions.dialogWidth &&
    dimensions.gameHeight === dimensions.fullScreenDimensions.dialogHeight;

  return (
    <StyledOldDesktopGame
      dimensions={dimensions}
      ref={container}
      gameSizeIsEqualWithDialogSize={gameSizeIsEqualWithDialogSize}
    >
      {dimensions.dialogWidth > 0 && (
        <div className={cn("desktop-game__game-container")}>
          {dimensions.gameWidth > 0 && (
            <iframe
              title="Game iframe"
              className="desktop-game__game"
              src={startGameOptions.GameURL}
              frameBorder="0"
              seamless={true}
            >
              <p>Your browser does not support iframes.</p>
            </iframe>
          )}
          <IconButton
            icon={<CloseIcon />}
            className="desktop-game__close-button"
            action={() => push("/loggedin")}
          />
        </div>
      )}
    </StyledOldDesktopGame>
  );
};

export { OldDesktopGame };
