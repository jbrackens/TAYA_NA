import React, { useState } from "react";
import { useTranslation } from "i18n";
import { Tabs, Table } from "antd";
import {
  useLimitsHistory,
  useCoolOffsHistory,
} from "../../../services/go-api/compliance/compliance-hooks";
import { useTimezone } from "@phoenix-ui/utils";
import { defaultNamespaces } from "../defaults";

export enum RgHistoryQueryEnum {
  COOL_OFF = "COOL_OFF",
  LIMITS = "LIMITS",
}

export type RqHistoryType =
  | RgHistoryQueryEnum.COOL_OFF
  | RgHistoryQueryEnum.LIMITS;

const PAGE_SIZE = 10;

function RgHistory() {
  const { t } = useTranslation(["rg-history"]);
  const { getTimeWithTimezone } = useTimezone();
  const [activeTab, setActiveTab] = useState<RqHistoryType>(
    RgHistoryQueryEnum.LIMITS,
  );
  const [limitsPage, setLimitsPage] = useState(1);
  const [coolOffsPage, setCoolOffsPage] = useState(1);

  const {
    data: limitsData,
    isLoading: limitsLoading,
  } = useLimitsHistory(limitsPage, PAGE_SIZE);

  const {
    data: coolOffsData,
    isLoading: coolOffsLoading,
  } = useCoolOffsHistory(coolOffsPage, PAGE_SIZE);

  const limitsColumns = [
    {
      title: t("LIMIT_TYPE"),
      dataIndex: "limit_type",
      key: "limit_type",
    },
    {
      title: t("PERIOD"),
      dataIndex: "period",
      key: "period",
    },
    {
      title: t("AMOUNT"),
      dataIndex: "amount",
      key: "amount",
      render: (val: number) => val?.toFixed(2),
    },
    {
      title: t("EFFECTIVE_DATE"),
      dataIndex: "effective_date",
      key: "effective_date",
      render: (val: string) => getTimeWithTimezone(val).format("lll"),
    },
  ];

  const coolOffColumns = [
    {
      title: t("CAUSE"),
      dataIndex: "cause",
      key: "cause",
    },
    {
      title: t("START_DATE"),
      dataIndex: "start_date",
      key: "start_date",
      render: (val: string) => getTimeWithTimezone(val).format("lll"),
    },
    {
      title: t("END_DATE"),
      dataIndex: "end_date",
      key: "end_date",
      render: (val: string) => getTimeWithTimezone(val).format("lll"),
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as RqHistoryType)}>
        <Tabs.TabPane tab={t("LIMITS_TAB")} key={RgHistoryQueryEnum.LIMITS}>
          <Table
            columns={limitsColumns}
            dataSource={limitsData?.data || []}
            loading={limitsLoading}
            rowKey="id"
            pagination={{
              current: limitsPage,
              pageSize: PAGE_SIZE,
              total: limitsData?.pagination?.total || 0,
              onChange: (page) => setLimitsPage(page),
            }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab={t("COOL_OFF_TAB")} key={RgHistoryQueryEnum.COOL_OFF}>
          <Table
            columns={coolOffColumns}
            dataSource={coolOffsData?.data || []}
            loading={coolOffsLoading}
            rowKey="id"
            pagination={{
              current: coolOffsPage,
              pageSize: PAGE_SIZE,
              total: coolOffsData?.pagination?.total || 0,
              onChange: (page) => setCoolOffsPage(page),
            }}
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}

RgHistory.namespacesRequired = ["rg-history", ...defaultNamespaces];

export default RgHistory;
