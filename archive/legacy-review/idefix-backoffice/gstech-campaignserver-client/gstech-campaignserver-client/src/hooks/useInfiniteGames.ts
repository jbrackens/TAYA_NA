import { useMemo, useState, useCallback } from "react";
import useInView from "react-cool-inview";
import { Game } from "app/types";
import { useDidUpdate } from "./";

const useInfiniteGames = (games: Game[], size: number) => {
  const [renderedGamesLength, setRenderedGamesLength] = useState<number>(size);

  const onShowMore = useCallback(
    () => setRenderedGamesLength(Math.min(renderedGamesLength + size, games.length)),
    [renderedGamesLength, games, size]
  );

  const { observe: loaderRef } = useInView<HTMLDivElement>({
    rootMargin: "400px",
    onEnter: ({ unobserve, observe }) => {
      unobserve();
      onShowMore();
      observe();
    }
  });

  useDidUpdate(() => {
    setRenderedGamesLength(size);
  }, [games]);

  const result = useMemo(
    () => ({
      loaderRef,
      hasMore: renderedGamesLength < games.length,
      renderedGames: games.slice(0, renderedGamesLength)
    }),
    [games, loaderRef, renderedGamesLength]
  );

  return result;
};

export { useInfiniteGames };
