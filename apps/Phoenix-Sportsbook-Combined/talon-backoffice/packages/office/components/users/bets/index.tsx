import React from "react";
import { Tag } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "i18n";
import {
  resolveResult,
  resolveType,
  resolveStatus,
  // composeResultOptions,
  // composeTypeOptions,
} from "../../bets/utils/resolvers";
import { TablePagination } from "types/filters";
import Table from "../../layout/table";
import { TalonBet, TalonBetLeg } from "../../../types/bets";
import {
  BetType,
  BetResult,
  IdAndName,
  Id,
  BetStatusEnum,
  DisplayOdds,
  useTimezone,
} from "@phoenix-ui/utils";
import Link from "next/link";
import defaultMenuStructure from "../../../providers/menu/structure";
import SportIcon from "../../sport/icon";
import { SPORT_ICON_SIZE } from "../../sport/icon/index.styled";
import UserBetCancel from "./cancel";

const { CDN_URL } = require("next/config").default().publicRuntimeConfig;

type UsersDetailsBetsListProps = {
  data: TalonBet[];
  pagination: TablePagination | {};
  isLoading: boolean | undefined;
  handleTableChange: any;
  setRefreshDataFunc: any;
};

const UsersDetailsBetsList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
  setRefreshDataFunc,
}: UsersDetailsBetsListProps) => {
  const { t } = useTranslation(["common", "page-bets"]);

  const generateSportIconUrl = (sportId: Id) => {
    const formattedId = String(sportId).replace(/:/g, "_");

    return `${CDN_URL}/images/sports/${formattedId}/icon.svg`;
  };

  const generateSportIcons = (betId: string, sports: Array<IdAndName>) =>
    sports
      .map((sport: IdAndName) => generateSportIconUrl(sport.id))
      .map((iconUrl, n: number) => (
        <SportIcon key={`${betId}-sport-${n}`} src={iconUrl} />
      ));

  const onCancelBet = () => {
    setRefreshDataFunc(true);
  };

  const renderCancelButton = (legs: any) => {
    const leg = legs[0];
    if (leg.status === BetStatusEnum.OPEN) {
      return (
        <UserBetCancel
          key="action-cancel-bet"
          id={leg.id}
          label={t("page-users-details:ACTION_CANCEL_BET")}
          onComplete={onCancelBet}
        />
      );
    }
  };

  const renderStatus = (legs: any) => {
    const leg = legs[0];
    const { color, tKey } = resolveStatus(leg.status);
    return (
      <Tag color={color} key={leg.status}>
        {t(`page-bets:${tKey}`).toUpperCase()}
      </Tag>
    );
  };

  const { getTimeWithTimezone } = useTimezone();

  const columns = [
    {
      title: t("page-bets:HEADER_GAMES"),
      render: ({ betId, sports }: TalonBet) =>
        generateSportIcons(betId, sports),
    },
    {
      title: t("page-bets:HEADER_PLACED_AT"),
      // sorter: true,
      dataIndex: "placedAt",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
    },
    {
      title: t("page-bets:HEADER_TYPE"),
      // sorter: true,
      dataIndex: "betType",
      // filters: composeTypeOptions(t, "page-bets:CELL_TYPE"),
      render: (type: BetType) => t(`page-bets:${resolveType(type)}`),
    },
    {
      title: t("page-bets:HEADER_BET"),
      render: (value: {
        stake: { amount: number };
        displayOdds: DisplayOdds;
      }) =>
        `$${value.stake.amount.toFixed(2)} @ ${
          value.displayOdds ? value.displayOdds.decimal : "-"
        }`,
    },
    {
      title: t("page-bets:HEADER_RESULT"),
      // sorter: true,
      dataIndex: "outcome",
      // filters: composeResultOptions(t, "page-bets:CELL_RESULT"),
      render: (betResult: BetResult) => {
        const { color, tKey } = resolveResult(betResult);
        return (
          <Tag color={color} key={betResult}>
            {t(`page-bets:${tKey}`).toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: t("page-bets:HEADER_STATUS"),
      dataIndex: "legs",
      render: renderStatus,
    },
    {
      title: "",
      dataIndex: "legs",
      render: renderCancelButton,
    },
  ];

  const expandedRowRender = (record: TalonBet) => {
    const expandedRowColumns = [
      {
        title: t("page-bets:HEADER_BET_GAME"),
        width: SPORT_ICON_SIZE,
        render: ({ sport }: TalonBetLeg) => (
          <SportIcon src={generateSportIconUrl(sport.id)} />
        ),
      },
      {
        title: t("page-bets:HEADER_BET_COMPETITION"),
        render: ({ tournament }: TalonBetLeg) => (
          <Link href={`#${tournament.id}`}>{tournament.name}</Link>
        ),
      },
      {
        title: t("page-bets:HEADER_BET_FIXTURE"),
        render: ({ fixture }: TalonBetLeg) => (
          <span>{fixture.name}</span>
        ),
      },
      {
        title: t("page-bets:HEADER_BET_MARKET"),
        render: ({ market }: TalonBetLeg) => (
          <Link
            href={defaultMenuStructure
              .get("risk-management")
              .markets.details.render({
                id: market.id,
              })}
          >
            {market.name}
          </Link>
        ),
      },
      {
        title: t("page-bets:HEADER_BET_EVENT"),
        render: ({ fixture }: TalonBetLeg) =>
          getTimeWithTimezone(dayjs(fixture.startTime)).format(
            t("common:DATE_TIME_FORMAT"),
          ),
      },
      {
        title: t("page-bets:HEADER_BET_SETTLED"),
        dataIndex: "settledAt",
        render: (value: string) =>
          value
            ? getTimeWithTimezone(dayjs(value)).format(
                t("common:DATE_TIME_FORMAT"),
              )
            : "",
      },
      {
        title: t("page-bets:HEADER_BET_RESULT"),
        dataIndex: "outcome",
        render: (legResult: BetResult) => {
          const { color, tKey } = resolveResult(legResult);
          return (
            <Tag color={color} key={legResult}>
              {t(`page-bets:${tKey}`).toUpperCase()}
            </Tag>
          );
        },
      },
      {
        title: t("page-bets:HEADER_BET_ODDS"),
        dataIndex: "displayOdds",
        render: (value: DisplayOdds) => (value ? value.decimal : "-"),
      },
    ];

    return (
      <Table
        rowKey={(nestedRecord) => nestedRecord.id}
        columns={expandedRowColumns}
        dataSource={record.legs}
        pagination={false}
      />
    );
  };

  return (
    <Table
      columns={columns}
      rowKey={(record) => record.betId}
      dataSource={data}
      pagination={{
        ...pagination,
        pageSizeOptions: ["10", "20", "50", "100"],
        showSizeChanger: true,
      }}
      loading={isLoading}
      scrollable={true}
      childrenColumnName="betParts"
      expandable={{ expandedRowRender }}
      onChange={handleTableChange}
    />
  );
};

export default UsersDetailsBetsList;
