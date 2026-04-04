import React from "react";
import { Tag } from "antd";
import { useTranslation } from "i18n";
import { FixtureStatus } from "@phoenix-ui/utils";
// import TableFilterText from "../../layout/table/filter-text";
import PageHeader from "../../layout/page-header";
import { /*composeOptions,*/ resolveStatus } from "../utils/resolvers";
// import { RefsCollection } from "../../../lib/utils/filters";
import Table from "../../layout/table";
import { TalonFixture } from "../../../types/fixture.d";
import { TablePagination } from "../../../types/filters";
import SportScore from "../../sport/score";
import TableActions from "../../layout/table/actions";
import defaultMenuStructure from "../../../providers/menu/structure";
import { MenuModulesPathEnum } from "../../../providers/menu/structure";

type FixturesListProps = {
  data: TalonFixture[];
  pagination: TablePagination | {};
  isLoading: boolean | undefined;
  handleTableChange: any;
};

const FixturesList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
}: FixturesListProps) => {
  const { t } = useTranslation("page-fixtures");
  // const refs = new RefsCollection();
  const columns = [
    {
      title: t("HEADER_SPORT"),
      // sorter: true,
      dataIndex: ["sport", "name"],
      // ...TableFilterText.getColumnSearchProps(
      //   "sportName",
      //   refs,
      //   t("HEADER_SPORT"),
      // ),
    },
    {
      title: t("HEADER_NAME"),
      // sorter: true,
      dataIndex: ["fixtureName"],
      // ...TableFilterText.getColumnSearchProps(
      //   "fixtureName",
      //   refs,
      //   t("HEADER_NAME"),
      // ),
    },
    {
      title: t("HEADER_STATUS"),
      // sorter: true,
      dataIndex: ["status"],
      // filters: composeOptions(t, "CELL_STATUS"),
      render: (status: FixtureStatus) => {
        const { color, tKey } = resolveStatus(status, "CELL_STATUS");
        return (
          <Tag color={color} key={status}>
            {t(tKey).toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: t("HEADER_MARKETS_COUNT"),
      // sorter: true,
      dataIndex: "marketsTotalCount",
      // ...TableFilterText.getColumnSearchProps(
      //   "marketsTotalCount",
      //   refs,
      //   t("HEADER_MARKETS_COUNT"),
      // ),
    },
    {
      title: t("HEADER_SCORE"),
      render: (value: TalonFixture) => {
        return (
          <SportScore score={value.score} competitors={value.competitors} />
        );
      },
    },
    {
      title: <TableActions>{t("HEADER_ACTIONS")}</TableActions>,
      width: 100,
      render: ({ fixtureId }: TalonFixture) => (
        <TableActions>
          <a
            href={defaultMenuStructure
              .get(MenuModulesPathEnum.RISK_MANAGEMENT)
              .fixtures.details.render({
                id: fixtureId,
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
        rowKey={(record) => record.fixtureId}
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

export default FixturesList;
