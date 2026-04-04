import * as React from "react";
import { useSelector } from "react-redux";
import { Game, GamesCategory } from "@brandserver-client/types";
import { getActiveCategory, getSearchQuery, getGames } from "../games/duck";
import { useDidUpdate } from "@brandserver-client/hooks";

function initializeFilteredGamesState(
  games: Game[],
  activeCategory: GamesCategory["tag"],
  searchQuery: string
) {
  if (activeCategory === "all") {
    if (searchQuery === "") {
      return games;
    }

    const query = searchQuery.split(" ").join("").toLowerCase();

    return games.filter(game => {
      const keywords = game.keywords.split(" ").join("");
      return keywords.includes(query);
    });
  }

  return games.filter(game => game.tags.includes(activeCategory));
}

export default function useGamesFilter(): Game[] {
  const games = useSelector(getGames);
  const searchQuery = useSelector(getSearchQuery);
  const activeGameCategory = useSelector(getActiveCategory);

  const [filteredGames, setFilteredGames] = React.useState(() =>
    initializeFilteredGamesState(games, activeGameCategory, searchQuery)
  );

  useDidUpdate(() => {
    const query = searchQuery.split(" ").join("").toLowerCase();

    requestAnimationFrame(() =>
      setFilteredGames(
        games.filter(game => {
          const keywords = game.keywords.split(" ").join("");
          return keywords.includes(query);
        })
      )
    );
  }, [searchQuery]);

  useDidUpdate(() => {
    if (activeGameCategory === "all") {
      setFilteredGames(games);
    } else {
      setFilteredGames(
        games.filter(game => game.tags.includes(activeGameCategory))
      );
    }
  }, [activeGameCategory]);

  return filteredGames;
}
