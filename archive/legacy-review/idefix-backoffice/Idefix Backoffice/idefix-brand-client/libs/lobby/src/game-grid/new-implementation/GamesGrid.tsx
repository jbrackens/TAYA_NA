import { useMessages } from "@brandserver-client/hooks";
import { useRegistry } from "@brandserver-client/ui";
import cn from "classnames";
import * as React from "react";
import { useIntl } from "react-intl";
import { ThemeContext } from "styled-components";
import GridGame from "../GridGame";
import GameCard from "./GameCard";
import { useInfiniteGames } from "./useInfiniteGames";
import { GamesGrid } from "./styled";
import useGamesFilter from "../useGamesFilter";
import { useRouter } from "next/router";

const GAMES_CHUNK_SIZE = 80;

const GamesGridComponent = () => {
  const { Loader } = useRegistry();
  const { locale } = useIntl();
  const { thumbsCdn } = React.useContext(ThemeContext);

  const filteredGames = useGamesFilter();

  const { asPath } = useRouter();

  const isFreeGames = asPath.includes("/games/all");

  const messages = useMessages({
    noresult: "search.noresult"
  });

  const { loaderRef, hasMore, renderedGames } = useInfiniteGames(
    filteredGames,
    GAMES_CHUNK_SIZE
  );

  return (
    <GamesGrid>
      {renderedGames.length === 0 && (
        <div className="no-result" id="noresult">
          {messages.noresult}
        </div>
      )}

      <div className="games">
        {renderedGames.map(game => (
          <GridGame
            className={cn(["game", game.viewMode])}
            key={game.id}
            game={game}
          >
            <GameCard
              game={game}
              thumbsCdn={thumbsCdn}
              locale={locale}
              freeGames={isFreeGames}
            />
          </GridGame>
        ))}

        <div
          ref={loaderRef}
          className={cn("games__loader-wrap", {
            "games__loader-wrap--hidden": !hasMore
          })}
        >
          <Loader className="games__loader" />
        </div>
      </div>
    </GamesGrid>
  );
};

export default GamesGridComponent;
