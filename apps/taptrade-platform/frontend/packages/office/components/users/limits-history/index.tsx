import { useTranslation } from "i18n";
import { TablePagination } from "../../../types/filters";
import {
  LimitsHistoryData,
  LimitType,
  LimitTypeEnum,
  PeriodType,
} from "../../../types/punters";
import Table from "../../layout/table";
import dayjs from "dayjs";
import { useTimezone } from "@taptrade-ui/utils";

type UsersDetailsLimitsHistoryListProps = {
  data: Array<LimitsHistoryData>;
  pagination: {} | TablePagination;
  isLoading: boolean | undefined;
  handleTableChange: any;
};

function limitTypeTranslationKey(limitType: LimitType): string {
  switch (limitType) {
    case LimitTypeEnum.POINT_ADD_AMOUNT:
      return "LIMIT_TYPE_POINT_ADD_AMOUNT";
    case LimitTypeEnum.PREDICTION_POINT_AMOUNT:
      return "LIMIT_TYPE_PREDICTION_POINT_AMOUNT";
    default:
      return limitType;
  }
}

const UsersDetailsLimitsHistoryList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
}: UsersDetailsLimitsHistoryListProps) => {
  const { t } = useTranslation(["common", "page-users-details"]);

  const { getTimeWithTimezone } = useTimezone();

  const columns = [
    {
      title: t("page-users-details:HEADER_LIMIT_TYPE"),
      dataIndex: "limitType",
      key: "LIMIT_TYPE",
      render: (limitType: LimitType) =>
        t(`page-users-details:${limitTypeTranslationKey(limitType)}`),
    },
    {
      title: t("page-users-details:HEADER_PERIOD"),
      dataIndex: "period",
      key: "PERIOD",
      render: (period: PeriodType) => t(`page-users-details:${period}`),
    },
    {
      title: t("page-users-details:HEADER_LIMIT"),
      dataIndex: "limit",
      key: "LIMIT",
    },
    {
      title: t("page-users-details:HEADER_REQUESTED_AT"),
      dataIndex: "requestedAt",
      key: "REQUESTED_AT",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
    },
    {
      title: t("page-users-details:HEADER_EFFECTIVE_FROM"),
      dataIndex: "effectiveFrom",
      key: "EFFECTIVE_FROM",
      render: (value: string) =>
        getTimeWithTimezone(dayjs(value)).format(t("common:DATE_TIME_FORMAT")),
    },
  ];

  return (
    <Table
      columns={columns}
      rowKey={(record) => record.sessionId}
      dataSource={data}
      pagination={{
        ...pagination,
        pageSizeOptions: ["10", "20", "50", "100"],
        showSizeChanger: true,
      }}
      loading={isLoading}
      scrollable={true}
      onChange={handleTableChange}
    />
  );
};

export default UsersDetailsLimitsHistoryList;
