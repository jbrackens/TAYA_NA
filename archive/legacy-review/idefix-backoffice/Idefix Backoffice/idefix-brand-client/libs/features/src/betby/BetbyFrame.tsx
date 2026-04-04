import { StartGameOptions } from "@brandserver-client/types";
import React, { FC } from "react";
import styled from "styled-components";

import { BETBY_FRAME_ID } from "./constants";
import { useBetbyEvents } from "./hooks/useBetbyEvents";

interface Props {
  startGameOptions?: StartGameOptions;
}

const BetbyFrame: FC<Props> = ({ startGameOptions }) => {
  useBetbyEvents();

  return (
    <StyledBetbyFrame>
      {startGameOptions && (
        <iframe
          id={BETBY_FRAME_ID}
          src={startGameOptions.GameURL}
          frameBorder="0"
          seamless={true}
        >
          <p>Your browser does not support iframes.</p>
        </iframe>
      )}
    </StyledBetbyFrame>
  );
};

const StyledBetbyFrame = styled.div`
  display: flex;
  position: relative;
  height: 100%;
  width: 100%;

  & > iframe {
    width: 100%;
    height: 100%;
  }
`;

export { BetbyFrame };
