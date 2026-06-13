import React from "react";
import { Tag } from "antd";
import { useTranslation } from "i18n";
import { MarketLifecycleType, MoneyValue } from "@phoenix-ui/utils";
// import TableFilterText from "../../layout/table/filter-text";
import PageHeader from "../../layout/page-header";
import {
  /*composeLifecycleOptions,*/ resolveLifecycle,
} from "../utils/resolvers";
// import { RefsCollection } from "../../../lib/utils/filters";
import Table from "../../layout/table";
import { TalonSingleMarketFixture, TalonMarket } from "../../../types/market.d";
import { TablePagination } from "../../../types/filters";
import SportScore from "../../sport/score";
import TableActions from "../../layout/table/actions";
import defaultMenuStructure from "../../../providers/menu/structure";
import { MenuModulesPathEnum } from "../../../providers/menu/structure";

type MarketsListProps = {
  data: TalonSingleMarketFixture[];
  pagination: TablePagination | {};
  isLoading: boolean | undefined;
  handleTableChange: any;
};

const MarketsList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
}: MarketsListProps) => {
  const { t } = useTranslation("page-markets");
  // const refs = new RefsCollection();
  const columns = [
    {
      title: t("HEADER_SPORT"),
      // sorter: true,
      dataIndex: ["sport", "abbreviation"],
      // ...TableFilterText.getColumnSearchProps(
      //   "sportName",
      //   refs,
      //   t("HEADER_SPORT"),
      // ),
    },
    {
      title: t("HEADER_NAME"),
      // sorter: true,
      dataIndex: ["market", "marketName"],
      // ...TableFilterText.getColumnSearchProps(
      //   "marketName",
      //   refs,
      //   t("HEADER_NAME"),
      // ),
    },
    {
      title: t("HEADER_FIXTURE_NAME"),
      // sorter: true,
      dataIndex: "fixtureName",
      // ...TableFilterText.getColumnSearchProps(
      //   "fixtureName",
      //   refs,
      //   t("HEADER_FIXTURE_NAME"),
      // ),
    },
    {
      title: t("HEADER_LIFECYCLE_STATUS"),
      // sorter: true,
      dataIndex: ["market", "currentLifecycle", "type"],
      // filters: composeLifecycleOptions(t, "CELL_LIFECYCLE_TYPE"),
      render: (type: MarketLifecycleType) => {
        const { color, tKey } = resolveLifecycle(type, "CELL_LIFECYCLE_TYPE");
        return (
          <Tag color={color} key={type}>
            {t(tKey).toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: t("HEADER_SCORE"),
      render: (value: TalonSingleMarketFixture) => {
        return (
          <SportScore score={value.score} competitors={value.competitors} />
        );
      },
    },
    {
      title: t("HEADER_EXPOSURE"),
      // sorter: true,
      dataIndex: ["market", "exposure"],
      // ...TableFilterText.getColumnSearchProps(
      //   "exposure",
      //   refs,
      //   t("HEADER_EXPOSURE"),
      // ),
      render: (exposure: MoneyValue) =>
        exposure ? (
          <>
            {exposure?.currency} {exposure?.amount}{" "}
          </>
        ) : (
          "N/A"
        ),
    },
    {
      title: <TableActions>{t("HEADER_ACTIONS")}</TableActions>,
      width: 100,
      dataIndex: ["market"],
      render: (market: TalonMarket) => (
        <TableActions>
          <a
            href={defaultMenuStructure
              .get(MenuModulesPathEnum.RISK_MANAGEMENT)
              .markets.details.render({
                id: market.marketId,
              })}
          >
            {t("ACTION_DETAILS")}
          </a>
        </TableActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("HEADER")} backIcon={false} />
      <Table
        columns={columns}
        rowKey={(record) => record.market.marketId}
        dataSource={data}
        pagination={{
          ...pagination,
          pageSizeOptions: ["10", "20", "50", "100"],
          showSizeChanger: true,
        }}
        loading={isLoading}
        onChange={handleTableChange}
      />
    </>
  );
};

export default MarketsList;
