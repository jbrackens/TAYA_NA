import * as React from "react";
import { useSelector } from "react-redux";
import { OldDesktopGame } from "./components/OldDesktopGame";
import { MobileGame } from "./components/MobileGame";
import { GameMessages } from "./components/GameMessages";
import { GameOverlay } from "./components/GameOverlay";
import { useGameModal } from "./useGameModal";
import { useGameRouteChangeStart } from "./useGameRouteChangeStart";
import { getMobile } from "..";

interface Props {
  gameId: string;
}

const GameModal: React.FC<Props> = ({ gameId }) => {
  const isMobile = useSelector(getMobile);
  const { gameOptions } = useGameModal(gameId);

  useGameRouteChangeStart();

  return (
    <GameOverlay>
      <GameMessages startGameOptions={gameOptions} />

      {isMobile && !!gameOptions && (
        <MobileGame startGameOptions={gameOptions} />
      )}

      {!isMobile && !!gameOptions && (
        <OldDesktopGame startGameOptions={gameOptions} />
      )}
    </GameOverlay>
  );
};

export { GameModal };
