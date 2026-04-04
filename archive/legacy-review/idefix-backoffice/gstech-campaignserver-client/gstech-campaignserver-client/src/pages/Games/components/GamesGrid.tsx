import * as React from "react";
import styled from "styled-components";
import cn from "classnames";
import { Game } from "app/types";

import { Search, Loader } from "../../../components";
import { GameGridCell } from "./";
import useDebounce from "../../../hooks/useDebounce";
import searchByKeys from "../../../utils/searchByKeys";
import { useInfiniteGames } from "../../../hooks";

const StyledGrid = styled.div`
  padding: 0;
  margin: 48px -27px 0;
  display: grid;
  align-items: center;
  justify-items: center;
  justify-content: center;
  grid-auto-flow: dense;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, 150px);

  &.LD {
    grid-template-columns: repeat(auto-fill, 165px);
  }

  .grid__search {
    position: absolute;
    top: 32px;
    left: 32px;
  }

  .loader-wrapper {
    width: 20px;
    height: 20px;

    &--hidden {
      display: none;
    }
  }
`;
interface IProps {
  brandId: string;
  data: Game[];
  isLoading: boolean;
  handleOpenEditGameDrawer: (gameId: number) => void;
}

const LIST_SIZE = 80;

const GamesGrid: React.FC<IProps> = ({ brandId, data, isLoading, handleOpenEditGameDrawer }) => {
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const rawResults = React.useMemo(() => searchByKeys(["name"], debouncedSearch, data), [debouncedSearch, data]);

  const { loaderRef, hasMore, renderedGames } = useInfiniteGames(rawResults, LIST_SIZE);

  const handleChangeSearch = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleEditGame = React.useCallback(
    (gameId: number) => () => {
      handleOpenEditGameDrawer(gameId);
    },
    [handleOpenEditGameDrawer]
  );

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <Loader wrapped />
      </div>
    );
  }

  return (
    <StyledGrid className={cn(brandId)}>
      <Search className="grid__search" value={searchQuery} onChange={handleChangeSearch} />
      {renderedGames.map(({ viewMode, thumbnailId, name, id }) => (
        <GameGridCell
          key={id}
          name={name}
          viewMode={viewMode}
          brandId={brandId}
          thumbnailId={thumbnailId!}
          onClick={handleEditGame(id)}
        />
      ))}
      <div ref={loaderRef} className={cn("loader-wrapper", { "loader-wrapper--hidden": !hasMore })}>
        <Loader />
      </div>
    </StyledGrid>
  );
};

export { GamesGrid };
