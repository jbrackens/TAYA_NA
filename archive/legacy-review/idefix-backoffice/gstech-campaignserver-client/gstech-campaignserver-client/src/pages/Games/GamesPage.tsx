import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouteMatch, useHistory } from "react-router-dom";
import styled from "styled-components";

import { selectBrandSettingsIsLoading, selectSettingsIsLoading } from "../../modules/app";
import { PageLayout, Tabs, Tab, FabButton } from "../../components";
import { ViewGrid, ViewList } from "../../icons";
import { GamesGrid, GamesTable } from "./components";
import { fetchGames, fetchPermalinks, selectAllGames, selectIsLoading, resetGamesState } from "./";
import { filterGamesByStatus } from "./utils";
import { VisibilityFilter, DisplayMode } from "./types";
import { AppDispatch } from "../../redux";

const StyledPage = styled.div`
  .table-controls {
    justify-content: space-between;
  }
  .control-tabs {
    display: flex;
    justify-content: flex-end;
    margin-bottom: -32px;

    div:not(:first-child) {
      margin-left: 8px;
    }
  }
`;

interface Params {
  brandId: string;
}

export const GamesPage = () => {
  const dispatch: AppDispatch = useDispatch();
  const { url } = useRouteMatch();
  const { push } = useHistory();
  const { brandId } = useParams<Params>();
  const [visibilityFilter, setVisibilityFilter] = React.useState<VisibilityFilter>("all");
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>("list");

  const isLoadingGames = useSelector(selectIsLoading);
  const isLoadingSettings = useSelector(selectSettingsIsLoading);
  const isLoadingBrandSettings = useSelector(selectBrandSettingsIsLoading);
  const isLoading = isLoadingGames || isLoadingSettings || isLoadingBrandSettings;

  const games = useSelector(selectAllGames);
  const data = React.useMemo(() => filterGamesByStatus(games, visibilityFilter), [games, visibilityFilter]);

  React.useEffect(() => {
    const fetchGamesPromise = dispatch(fetchGames(brandId));
    const fetchPermalinksPromise = dispatch(fetchPermalinks(brandId));
    return () => {
      fetchGamesPromise.abort();
      fetchPermalinksPromise.abort();
    };
  }, [dispatch, brandId]);

  React.useEffect(() => {
    return () => {
      dispatch(resetGamesState());
      setDisplayMode("list");
    };
  }, [dispatch, brandId]);

  const handleChangeDisplayMode = React.useCallback(
    (newMode: string | number | string[] | boolean) => setDisplayMode(newMode as DisplayMode),
    []
  );

  const handleChangeVisibilityFilter = React.useCallback(
    (newFilter: string | number | string[] | boolean) => setVisibilityFilter(newFilter as VisibilityFilter),
    []
  );

  const handleOpenAddGameDrawer = React.useCallback(
    () => push({ pathname: url, search: "drawer=add-game", state: { hasPrevRoute: true } }),
    [push, url]
  );

  const handleOpenEditGameDrawer = React.useCallback(
    (gameId: number) => push({ pathname: url, search: `drawer=edit-game&id=${gameId}`, state: { hasPrevRoute: true } }),
    [push, url]
  );

  return (
    <PageLayout
      fabButtonProps={{
        title: "Create new game",
        onClick: handleOpenAddGameDrawer
      }}
    >
      <StyledPage>
        <div className="control-tabs">
          <Tabs value={visibilityFilter} onChange={handleChangeVisibilityFilter}>
            <Tab value="all">All</Tab>
            <Tab value="active">Active</Tab>
            <Tab value="draft">Draft</Tab>
            <Tab value="archived">Archived</Tab>
          </Tabs>
          <Tabs value={displayMode} onChange={handleChangeDisplayMode}>
            <Tab value="list">
              <ViewList />
            </Tab>
            <Tab value="grid">
              <ViewGrid />
            </Tab>
          </Tabs>
        </div>

        <div>
          {displayMode === "list" && (
            <GamesTable
              brandId={brandId}
              data={data}
              isLoading={isLoading}
              handleOpenEditGameDrawer={handleOpenEditGameDrawer}
            />
          )}
          {displayMode === "grid" && (
            <GamesGrid
              brandId={brandId}
              data={data}
              isLoading={isLoading}
              handleOpenEditGameDrawer={handleOpenEditGameDrawer}
            />
          )}
        </div>

        <FabButton className="fab-button" title="Create new game" onClick={handleOpenAddGameDrawer} />
      </StyledPage>
    </PageLayout>
  );
};
