import React from "react";
import { Typography, Drawer, Timeline } from "antd";
import { useTranslation } from "i18n";
import { orderBy } from "lodash";
import FixtureMarketsHistoryItem, {
  FixtureMarketsHistoryDataItem,
  FixtureMarketsHistoryDataItemTypeEnum,
} from "./item";
import { TalonFixtureScoreHistory } from "../../../types/fixture.d";
import { TalonMarket, TalonMarketLifecycle } from "../../../types/market.d";
import { TalonCompetitorScoreHistory } from "../../../types/competitor.d";

export type FixtureMarketsHistoryData = {
  lifecycleChanges?: TalonMarketLifecycle[];
  markets?: TalonMarket[];
} & TalonFixtureScoreHistory;

export type FixtureMarketsHistoryProps = {
  data: FixtureMarketsHistoryData;
  single?: boolean;
};

export type FixtureMarketsHistoryDrawerDrawerProps = {
  data: FixtureMarketsHistoryData;
  visible: boolean | undefined;
  single?: boolean;
  onClose: () => void;
};

export const FixtureMarketsHistory = ({
  data,
  single,
}: FixtureMarketsHistoryProps) => {
  const scoreHistory =
    data?.scoreHistory?.map((details: TalonCompetitorScoreHistory) => ({
      type: FixtureMarketsHistoryDataItemTypeEnum.SCORE,
      details,
    })) || [];

  let lifecycleChanges: FixtureMarketsHistoryDataItem[] = [];
  if (single) {
    lifecycleChanges =
      data?.lifecycleChanges?.map((details: TalonMarketLifecycle) => ({
        type: FixtureMarketsHistoryDataItemTypeEnum.LIFECYCLE,
        details,
      })) || ([] as FixtureMarketsHistoryDataItem[]);
  } else {
    lifecycleChanges =
      data?.markets?.reduce(
        (prev: FixtureMarketsHistoryDataItem[], curr: TalonMarket) => {
          const { marketId, marketName, lifecycleChanges } = curr;
          return [
            ...prev,
            ...lifecycleChanges.map((details: TalonMarketLifecycle) => ({
              type: FixtureMarketsHistoryDataItemTypeEnum.LIFECYCLE,
              market: { marketId, marketName },
              details,
            })),
          ];
        },
        [],
      ) || ([] as FixtureMarketsHistoryDataItem[]);
  }

  const items = orderBy(
    [...scoreHistory, ...lifecycleChanges],
    "details.updatedAt",
    "desc",
  );
  return (
    <Typography>
      <Timeline>
        {items.map((item: FixtureMarketsHistoryDataItem, index: number) => (
          <FixtureMarketsHistoryItem key={index} {...item} />
        ))}
      </Timeline>
    </Typography>
  );
};

const FixtureMarketsHistoryDrawer = ({
  data,
  single,
  visible,
  onClose,
}: FixtureMarketsHistoryDrawerDrawerProps) => {
  const { t } = useTranslation([
    "page-fixtures-details",
    "page-markets-details",
  ]);

  return (
    <Drawer
      width="30%"
      placement="right"
      title={t(
        `page-${single ? "markets" : "fixtures"}-details:HEADER_HISTORY`,
      )}
      closable={true}
      onClose={onClose}
      visible={visible}
    >
      <FixtureMarketsHistory data={data} single={single} />
    </Drawer>
  );
};

export default FixtureMarketsHistoryDrawer;
