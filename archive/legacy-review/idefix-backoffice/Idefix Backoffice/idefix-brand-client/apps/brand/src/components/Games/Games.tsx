import * as React from "react";

import { useElementOffsetTop } from "@brandserver-client/hooks";
import { GamesGrid, GamesNav } from "@brandserver-client/lobby";

const Games = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const gamesOffsetTop = useElementOffsetTop(containerRef);
  return (
    <div ref={containerRef}>
      <GamesNav gamesOffsetTop={gamesOffsetTop} withCategories={false} />
      <GamesGrid />
    </div>
  );
};

export default Games;
