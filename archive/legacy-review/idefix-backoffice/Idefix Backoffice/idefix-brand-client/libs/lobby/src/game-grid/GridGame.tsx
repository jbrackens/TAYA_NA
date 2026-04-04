import React, { ReactNode } from "react";
import { Game } from "@brandserver-client/types";

interface Props {
  className?: string;
  game: Game;
  children: ReactNode;
}

const GridGame = ({
  className,
  game: { keywords, tags, searchOnly },
  children
}: Props) => (
  <div
    className={className}
    data-keywords={keywords}
    data-tags={tags.join(" ")}
    data-search-only={searchOnly || undefined}
  >
    {children}
  </div>
);

export default GridGame;
