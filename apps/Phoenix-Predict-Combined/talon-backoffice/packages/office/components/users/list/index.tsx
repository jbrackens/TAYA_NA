import React, { useRef, useEffect } from "react";
import dayjs from "dayjs";
import { Tag } from "antd";
import { useTranslation } from "i18n";
import TableFilterText from "../../layout/table/filter-text";
import PageHeader from "../../layout/page-header";
// import { composeOptions, resolveStatus } from "../utils/resolvers";
import { RefsCollection } from "../../../lib/utils/filters";
import { TablePagination } from "types/filters";
import Table from "../../layout/table";
import TableActions from "../../layout/table/actions";
import defaultMenuStructure from "../../../providers/menu/structure";
// import { PunterStatus } from "@phoenix-ui/utils";
import { TalonPunterShort } from "../../../types/punters.d";
import { Input } from "antd";
import { useRouter } from "next/router";
import { addQueryParam } from "../../../utils/queryParams";
import { useTimezone } from "@phoenix-ui/utils";

type UsersListProps = {
  data: TalonPunterShort[];
  pagination: TablePagination | {};
  isLoading: boolean | undefined;
  handleTableChange: any;
  handleOpenRecentActivity: any;
};

const UsersList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
}: // handleOpenRecentActivity,
UsersListProps) => {
  const { t } = useTranslation(["common", "page-users"]);
  const refs = new RefsCollection();

  const router = useRouter();
  const { Search } = Input;

  const {
    searchId,
    searchName,
    searchFName,
    searchLName,
    searchDob,
  } = router.query as {
    searchId?: string;
    searchName?: string;
    searchFName?: string;
    searchLName?: string;
    searchDob?: string;
  };

  const generateColumnSearch = (
    fieldName: string,
    title: string,
    onClearFilter?: () => void,
    defaultValue?: string | number,
    type?: "date" | "string",
  ) =>
    TableFilterText.getColumnSearchProps(
      fieldName,
      refs,
      t(title),
      onClearFilter,
      defaultValue,
      type,
    );

  const dobColumnSearch = generateColumnSearch(
    "dateOfBirth",
    t("page-users:HEADER_DOB"),
    () => addQueryParam({ searchDob: "" }, router),
    searchDob,
    "date",
  );

  const fNameCol = generateColumnSearch(
    "firstName",
    t("page-users:HEADER_FIRSTNAME"),
    () => addQueryParam({ searchFName: "" }, router),
    searchFName,
  );

  const lNameCol = generateColumnSearch(
    "lastName",
    t("page-users:HEADER_LASTNAME"),
    () => addQueryParam({ searchLName: "" }, router),
    searchLName,
  );

  const usernameCol = generateColumnSearch(
    "username",
    t("page-users:HEADER_USERNAME"),
    () => addQueryParam({ searchName: "" }, router),
    searchName,
  );

  const { getTimeWithTimezone } = useTimezone();

  const renderDateOfBirth = (value?: {
    day?: number;
    month?: number;
    year?: number;
  }) => {
    if (!value?.year || !value?.month || !value?.day) {
      return "-";
    }
    return getTimeWithTimezone(
      dayjs(`${value.year}-${value.month}-${value.day}`),
    ).format("ll");
  };

  const columns = [
    {
      title: t("page-users:HEADER_USERNAME"),
      dataIndex: "username",
      render: (username: string, row: any) => {
        return (
          <>
            {username}
            {row.isTestAccount && (
              <>
                <br />
                <Tag>{t("page-users:CELL_TEST_ACCOUNT")}</Tag>
              </>
            )}
          </>
        );
      },
      ...usernameCol,
      filterIcon: usernameCol.filterIcon(!!searchName),
    },
    {
      title: t("page-users:HEADER_FIRSTNAME"),
      dataIndex: "firstName",
      ...fNameCol,
      filterIcon: fNameCol.filterIcon(!!searchFName),
    },
    {
      title: t("page-users:HEADER_LASTNAME"),
      dataIndex: "lastName",
      ...lNameCol,
      filterIcon: lNameCol.filterIcon(!!searchLName),
    },
    {
      title: t("page-users:HEADER_DOB"),
      dataIndex: "dateOfBirth",
      render: renderDateOfBirth,
      ...dobColumnSearch,
      filterIcon: dobColumnSearch.filterIcon(!!searchDob),
    },
    {
      title: t("page-users:HEADER_EMAIL"),
      dataIndex: "email",
    },
    // {
    //   title: t("page-users:HEADER_STATUS"),
    //   sorter: true,
    //   dataIndex: "status",
    //   filters: composeOptions(t, "page-users:CELL_STATUS"),
    //   render: (status: PunterStatus) => {
    //     const { color, tKey } = resolveStatus(status);
    //     return (
    //       <Tag color={color} key={status}>
    //         {t(`page-users:${tKey}`).toUpperCase()}
    //       </Tag>
    //     );
    //   },
    // },
    {
      title: <TableActions>{t("page-users:HEADER_ACTIONS")}</TableActions>,
      render: (value: any) => (
        <TableActions>
          {/* <a
            href="#activity"
            onClick={() => handleOpenRecentActivity(value.id)}
          >
            {t("page-users:ACTION_ACTIVITY")}
          </a> */}
          <a
            href={defaultMenuStructure.users.details.render({
              id: value.id,
            })}
          >
            {t("page-users:ACTION_DETAILS")}
          </a>
        </TableActions>
      ),
    },
  ];
  const elementToScrollTo = useRef<HTMLDivElement>(null);

  const onSearch = (value: string) =>
    router.push(
      {
        query: {
          ...router.query,
          ...(value && { searchId: value }),
        },
      },
      undefined,
      { shallow: true },
    );

  useEffect(() => {
    elementToScrollTo.current?.scrollIntoView();
  }, [router.asPath]);

  return (
    <>
      <PageHeader
        title={t("page-users:HEADER")}
        backIcon={false}
        extra={
          <Search
            defaultValue={searchId}
            placeholder="Search user by id"
            onSearch={onSearch}
            allowClear
          />
        }
      />
      <Table
        columns={columns}
        rowKey={(record) => record.id}
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

export default UsersList;
