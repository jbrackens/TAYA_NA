import { useDidUpdate } from "@brandserver-client/hooks";
import { Game } from "@brandserver-client/types";
import { useInView } from "react-cool-inview";
import * as React from "react";

const useInfiniteGames = (games: Game[], chunkSize: number) => {
  const [renderedGamesLength, setRenderedGamesLength] =
    React.useState(chunkSize);

  const onShowMore = React.useCallback(
    () =>
      setRenderedGamesLength(
        Math.min(renderedGamesLength + chunkSize, games.length)
      ),
    [renderedGamesLength, games]
  );

  const { observe: loaderRef } = useInView<HTMLDivElement | null>({
    rootMargin: "400px",
    onEnter: async ({ unobserve, observe }) => {
      unobserve();
      onShowMore();
      observe();
    }
  });

  useDidUpdate(() => {
    setRenderedGamesLength(chunkSize);
  }, [games]);

  const result = React.useMemo(
    () => ({
      loaderRef,
      hasMore: renderedGamesLength < games.length,
      renderedGames: games.slice(0, renderedGamesLength)
    }),
    [renderedGamesLength, games]
  );

  return result;
};

export { useInfiniteGames };
