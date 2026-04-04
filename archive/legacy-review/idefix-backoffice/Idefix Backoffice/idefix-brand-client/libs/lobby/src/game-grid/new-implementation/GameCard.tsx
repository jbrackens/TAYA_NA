import { Game } from "@brandserver-client/types";
import Link from "next/link";
import * as React from "react";
import { PlayIcon } from "@brandserver-client/icons";
import BlurhashCanvas from "./BlurhashCanvas";
import VisibilitySensor from "react-visibility-sensor";

interface Props {
  game: Game;
  thumbsCdn?: string;
  locale: string;
  freeGames?: boolean;
}

const GameCard = ({ game, thumbsCdn, locale, freeGames }: Props) => {
  const gameId = game.id;
  const href = freeGames
    ? `/game?game=${gameId}&lang=${locale}`
    : { pathname: "/loggedin/game/[gameId]", query: { gameId } };

  const as = freeGames ? `/${locale}/game/${gameId}/` : undefined;

  const [imageLoaded, setImageLoaded] = React.useState(false);

  let jackpotValue = "";
  let jackpotCurrency = "";
  if (game.jackpotValue) {
    const firstNumberIndex = game.jackpotValue.search(/[0-9]/);
    jackpotValue = game.jackpotValue.slice(firstNumberIndex);
    jackpotCurrency = game.jackpotValue.slice(0, firstNumberIndex);
  }

  const onError = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) =>
      (event.currentTarget.style.display = "none"),
    []
  );

  const onLoad = React.useCallback(
    () => setTimeout(() => setImageLoaded(true), 500),
    []
  );

  return (
    <VisibilitySensor partialVisibility={true} offset={{ bottom: -2000 }}>
      {({ isVisible }: { isVisible: boolean }) => (
        <Link href={href} as={as}>
          <div>
            <a>
              {game.hash && !imageLoaded && isVisible && (
                <BlurhashCanvas
                  className="game__blurhash"
                  hash={game.hash}
                  width={16 * (game.viewMode === "single" ? 1 : 2)}
                  height={16 * (game.viewMode === "max" ? 2 : 1)}
                />
              )}
              <img
                className="game__image lazyload"
                alt={game.id}
                data-src={`${thumbsCdn}thumbs/${game.viewMode}/${game.thumbnail}`}
                data-srcset={`${thumbsCdn}thumbs2x/${game.viewMode}/${game.thumbnail} 2x`}
                onError={onError}
                onLoad={onLoad}
              />
              {game.jackpotValue && (
                <div
                  className={`game__jackpot-value game__jackpot-value--${game.viewMode}`}
                >
                  <span className="game__jackpot-value-currency">
                    {jackpotCurrency}{" "}
                  </span>
                  {jackpotValue}
                </div>
              )}
              <div className="game__description">{game.name}</div>
            </a>
            <div className="game__hover-overlay"></div>
            <PlayIcon className="game__hover-icon" />
          </div>
        </Link>
      )}
    </VisibilitySensor>
  );
};

export default React.memo(GameCard);
