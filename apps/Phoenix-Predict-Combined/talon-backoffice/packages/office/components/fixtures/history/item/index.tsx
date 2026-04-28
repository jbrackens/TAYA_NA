import React from "react";
import { Typography, Timeline, Tag, Space } from "antd";
import { NodeIndexOutlined, UpSquareOutlined } from "@ant-design/icons";
import {
  Layout,
  enumToObject,
  MarketLifecycleChangeReasonTypeEnum,
  useTimezone,
} from "@phoenix-ui/utils";
import dayjs from "dayjs";
import { useTranslation } from "i18n";
import { TalonMarket, TalonMarketLifecycle } from "../../../../types/market";
import { TalonCompetitorScoreHistory } from "../../../../types/competitor";
import { resolveLifecycle } from "../../../markets/utils/resolvers";
import { isNil } from "lodash";

export type FixtureMarketsHistoryDataItemDetails =
  | TalonMarketLifecycle
  | TalonCompetitorScoreHistory;
export enum FixtureMarketsHistoryDataItemTypeEnum {
  SCORE = "SCORE",
  LIFECYCLE = "LIFECYCLE",
}
export type FixtureMarketsHistoryDataItemType =
  | FixtureMarketsHistoryDataItemTypeEnum.SCORE
  | FixtureMarketsHistoryDataItemTypeEnum.LIFECYCLE;
export type FixtureMarketsHistoryDataItem = {
  type: FixtureMarketsHistoryDataItemType;
  market?: Pick<TalonMarket, "marketId" | "marketName">;
  details: FixtureMarketsHistoryDataItemDetails;
};

const { Text, Paragraph } = Typography;

const formatDataLine = (
  { type, details }: FixtureMarketsHistoryDataItem,
  t: Function,
) => {
  switch (type) {
    case FixtureMarketsHistoryDataItemTypeEnum.LIFECYCLE:
      const { lifecycle } = details as TalonMarketLifecycle;
      const { type: lifecycleType, changeReason } = lifecycle;
      const { color, tKey } = resolveLifecycle(lifecycleType, "LIFECYCLE_TYPE");
      return (
        <Space>
          <Tag color={color} style={{ marginRight: 0 }}>
            {t(`page-markets-details:${tKey}`)}
          </Tag>
          <Text ellipsis style={{ fontSize: 11, verticalAlign: "middle" }}>
            {t(`common:LABEL_BECAUSE_OF`)}
          </Text>
          <Text
            ellipsis
            style={{
              fontSize: 11,
              fontStyle: "italic",
              color: "grey",
              verticalAlign: "middle",
            }}
          >
            {(changeReason.type as string) in
            enumToObject(MarketLifecycleChangeReasonTypeEnum)
              ? t(`page-markets-details:LIFECYCLE_REASON_${changeReason.type}`)
              : changeReason.type}
          </Text>
        </Space>
      );
    case FixtureMarketsHistoryDataItemTypeEnum.SCORE:
      const { score } = details as TalonCompetitorScoreHistory;
      const { home, away } = score;
      let homeColor = "grey";
      let awayColor = "grey";
      if (home > away) {
        homeColor = "green";
        awayColor = "red";
      } else if (home < away) {
        homeColor = "red";
        awayColor = "green";
      }
      return (
        <Space align={Layout.Align.CENTER}>
          <Text>{t("sports:HOME")}</Text>
          <Tag color={homeColor} style={{ marginRight: 0 }}>
            {home}
          </Tag>
          {":"}
          <Tag color={awayColor} style={{ marginRight: 0 }}>
            {away}
          </Tag>
          <Text>{t("sports:AWAY")}</Text>
        </Space>
      );
    default:
      return null;
  }
};

const FixtureMarketsHistoryItem = ({
  type,
  market,
  details,
}: FixtureMarketsHistoryDataItem) => {
  const { updatedAt } = details;
  const { t } = useTranslation([
    "common",
    "sports",
    "page-fixtures-details",
    "page-markets-details",
  ]);

  let IconComponent;
  let color;
  let message;

  switch (type) {
    case FixtureMarketsHistoryDataItemTypeEnum.LIFECYCLE:
      message = t("page-fixtures-details:HISTORY_LIFECYCLE_CHANGE");
      IconComponent = NodeIndexOutlined;
      color = "geekblue";
      break;
    case FixtureMarketsHistoryDataItemTypeEnum.SCORE:
      message = t("page-fixtures-details:HISTORY_SCORE_CHANGE");
      IconComponent = UpSquareOutlined;
      color = "geekblue";
      break;
    default:
      return null;
  }

  const renderMarketInfo = () =>
    isNil(market) ? null : <Tag color="default">{market.marketName}</Tag>;

  const { getTimeWithTimezone } = useTimezone();

  return (
    <Timeline.Item
      dot={IconComponent ? <IconComponent size={16} /> : null}
      color={color}
    >
      <Text strong>
        {getTimeWithTimezone(dayjs(updatedAt)).format(
          t("common:DATE_TIME_FORMAT"),
        )}
      </Text>
      <Paragraph>
        <Space>
          <Text>
            {renderMarketInfo()}
            {message}
          </Text>
        </Space>
      </Paragraph>
      <Paragraph>{formatDataLine({ type, details }, t)}</Paragraph>
    </Timeline.Item>
  );
};

export default FixtureMarketsHistoryItem;
