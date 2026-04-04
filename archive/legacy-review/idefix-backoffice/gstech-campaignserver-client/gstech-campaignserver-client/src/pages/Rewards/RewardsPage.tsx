import * as React from "react";
import { unwrapResult } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { Column, CellProps, Row } from "react-table";
import { useParams, useRouteMatch, useHistory } from "react-router-dom";
import { RewardsConfigTable, Reward } from "app/types";

import { RewardWithOrder } from "./types";
import { PageLayout, Table, Select } from "../../components";
import {
  selectRewardTypesByBrand,
  selectRewardTableByBrandAndType,
  selectBrandSettingsIsLoading,
  selectSettingsIsLoading
} from "../../modules/app";
import { AppDispatch, RootState } from "../../redux";
import { fetchGames, resetGamesState } from "../Games";
import {
  fetchRewards,
  selectRewardsTableData,
  selectRewardsIsLoading,
  selectSelectedRewardsType,
  setSelectedRewardsType,
  updateReward,
  copyReward,
  resetRewardsState
} from "./rewardsSlice";
import { useQueryParameter } from "../../hooks";
import { GameCell, ShowMoreCell } from "./components";
import { getWidth } from "./utils";

interface Params {
  brandId: string;
}

const RewardsPage = () => {
  const dispatch: AppDispatch = useDispatch();
  const { brandId } = useParams<Params>();
  const { url } = useRouteMatch();
  const { push } = useHistory();

  const searchParams = useQueryParameter();
  const isRewardTypeParamExist = searchParams.has("type");
  const rewardType = searchParams.get("type") as string;
  const selectedRewardsType = useSelector(selectSelectedRewardsType);

  const rewardTypes = useSelector((state: RootState) => selectRewardTypesByBrand(state, brandId));
  const rewardTable = useSelector((state: RootState) => selectRewardTableByBrandAndType(state, brandId));

  const isLoadingContent = useSelector(selectRewardsIsLoading);
  const isLoadingSettings = useSelector(selectSettingsIsLoading);
  const isLoadingBrandSettings = useSelector(selectBrandSettingsIsLoading);
  const isLoading = isLoadingContent || isLoadingSettings || isLoadingBrandSettings;

  const rewards = useSelector(selectRewardsTableData);
  const tableData = React.useMemo(() => rewards, [rewards]);

  React.useEffect(() => {
    if (selectedRewardsType) {
      const fetchRewardsPromise = dispatch(fetchRewards({ type: selectedRewardsType, brandId }));
      return () => {
        fetchRewardsPromise.abort();
      };
    }
  }, [dispatch, selectedRewardsType, brandId]);

  React.useEffect(() => {
    dispatch(fetchGames(brandId));
  }, [brandId, dispatch]);

  React.useEffect(() => {
    rewardTypes && dispatch(setSelectedRewardsType(isRewardTypeParamExist ? rewardType : rewardTypes[0].type));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardTypes, dispatch]);

  React.useEffect(() => {
    return () => {
      dispatch(resetRewardsState());
      dispatch(resetGamesState());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeType = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch(setSelectedRewardsType(event.target.value));
    },
    [dispatch]
  );

  const handleOpenAddRewardDrawer = React.useCallback(
    () =>
      push({ pathname: url, search: `type=${selectedRewardsType}&drawer=add-reward`, state: { hasPrevRoute: true } }),
    [push, url, selectedRewardsType]
  );

  const handleOpenEditRewardDrawer = React.useCallback(
    (rewardId: number) => {
      push({
        pathname: url,
        search: `type=${selectedRewardsType}&drawer=edit-reward&id=${rewardId}`,
        state: { hasPrevRoute: true }
      });
    },
    [push, url, selectedRewardsType]
  );

  const handleUpdateRewardOrder = React.useCallback(
    (reward: Reward, order: number) => {
      const { id } = reward;

      dispatch(updateReward({ id, values: { ...reward, order }, brandId }));
    },
    [dispatch, brandId]
  );

  const handleCopyReward = React.useCallback(
    async (rewardId: number) => {
      const response = await dispatch(copyReward({ rewardId, brandId }));

      if (copyReward.fulfilled.match(response)) {
        const { reward } = unwrapResult(response);
        handleOpenEditRewardDrawer(reward.id);
      }
    },
    [brandId, dispatch, handleOpenEditRewardDrawer]
  );

  const handleRowClick = React.useCallback(
    ({ original: reward }: Row<RewardWithOrder>) => {
      handleOpenEditRewardDrawer(reward.id);
    },
    [handleOpenEditRewardDrawer]
  );

  const getTableColumns = React.useCallback(
    (fields: RewardsConfigTable[]): Array<Column<RewardWithOrder>> =>
      fields.map(({ title, property }) =>
        property === "game"
          ? ({
              Header: "Game",
              accessor: "permalink",
              width: 50,
              Cell: ({ cell }: CellProps<RewardWithOrder>) => <GameCell cell={cell} />
            } as Column<RewardWithOrder>)
          : ({ Header: title, accessor: property, width: getWidth(property) } as Column<RewardWithOrder>)
      ),
    []
  );

  const columns: Array<Column<RewardWithOrder>> = React.useMemo(
    () => [
      ...getTableColumns(rewardTable || []),
      {
        Header: "",
        width: 15,
        id: "showMore",
        Cell: ({ cell }: CellProps<RewardWithOrder>) => (
          <ShowMoreCell cell={cell} onUpdateReward={handleOpenEditRewardDrawer} onCopyReward={handleCopyReward} />
        )
      }
    ],
    [rewardTable, getTableColumns, handleOpenEditRewardDrawer, handleCopyReward]
  );

  return (
    <PageLayout
      fabButtonProps={{
        title: "Create new reward",
        onClick: handleOpenAddRewardDrawer
      }}
    >
      <Table
        columns={columns}
        data={tableData}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        onDrop={handleUpdateRewardOrder}
        draggableRows
        dimmedParameter={{ property: "active", not: true }}
      >
        <Select value={selectedRewardsType} onChange={handleChangeType}>
          {rewardTypes ? (
            rewardTypes.map(({ name, type }) => (
              <option key={type} value={type}>
                {name}
              </option>
            ))
          ) : (
            <option value="loading">Loading...</option>
          )}
        </Select>
      </Table>
    </PageLayout>
  );
};

export { RewardsPage };
