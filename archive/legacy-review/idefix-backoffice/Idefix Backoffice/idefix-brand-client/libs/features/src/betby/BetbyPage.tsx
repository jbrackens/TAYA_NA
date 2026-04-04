import * as React from "react";
import styled from "styled-components";
import { BETBY_FRAME_ID } from "./constants";
import { useIsBetby } from "./hooks/useIsBetby";

interface StyledGamePageProps {
  height: string;
}

const StyledGamePage = styled.div<StyledGamePageProps>`
  height: ${props => props.height};
  background-color: ${({ theme }) => theme.palette.primaryDark};
`;

const BetbyPage = () => {
  const [isIframeLoaded, setIsLoadedIframe] = React.useState(false);
  const isBetby = useIsBetby();

  React.useEffect(() => {
    const gameIframe = document.getElementById(
      BETBY_FRAME_ID
    ) as HTMLIFrameElement;

    if (gameIframe != null) {
      gameIframe.onload = function () {
        setIsLoadedIframe(true);
      };
    }

    setIsLoadedIframe(true);
  }, [setIsLoadedIframe]);

  return (
    <StyledGamePage height={isBetby && isIframeLoaded ? "auto" : "100vh"} />
  );
};

export { BetbyPage };
