import { StartGameOptions } from "@brandserver-client/types";
import React, { FC } from "react";
import styled from "styled-components";

const StyledMobileGame = styled.div`
  display: flex;
  position: relative;
  height: 100%;
  width: 100%;

  & > iframe {
    width: 100%;
    height: 100%;
  }
`;

interface Props {
  startGameOptions?: StartGameOptions;
}

const MobileGame: FC<Props> = ({ startGameOptions }) => {
  return (
    <StyledMobileGame>
      {startGameOptions && (
        <iframe
          id="gameIframe"
          src={startGameOptions.GameURL}
          frameBorder="0"
          seamless={true}
        >
          <p>Your browser does not support iframes.</p>
        </iframe>
      )}
    </StyledMobileGame>
  );
};

export { MobileGame };
