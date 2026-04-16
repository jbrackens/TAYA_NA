import Head from "next/head";
import { useTranslation } from "i18n";
import { useNavigation, Method, useTimezone } from "@phoenix-ui/utils";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { defaultNamespaces } from "../defaults";
import { StyledTitle } from "../../../components/pages/account/index.styled";
import { RgHistoryTable } from "../../profile/rg-history-table";
import { useApi } from "../../../services/api/api-service";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { message, Tabs } from "antd";
import { StyledTabs } from "../../tabs/index.styled";

export enum RgHistoryQueryEnum {
  COOL_OFF = "COOL_OFF",
  LIMITS = "LIMITS",
}

export type RqHistoryType =
  | RgHistoryQueryEnum.COOL_OFF
  | RgHistoryQueryEnum.LIMITS;

function RgHistory() {
  const { t } = useTranslation(["rg-history", "common"]);
  const { getTimeWithTimezone } = useTimezone();
  const { triggerApi, isLoading, data, error, resetHookState } = useApi(
    "punters/limits-history",
    Method.GET,
  );

  const coolOffHistoryApi = useApi("punters/cool-offs-history", Method.GET);

  const [tableData, setTableData] = useState<Array<{ key: number; LIMIT_TYPE?: string; PERIOD?: string; LIMIT?: string; REASON?: string; REQUESTED_AT?: string; EFFECTIVE_FROM?: string; COOL_OFF_START?: string; COOL_OFF_END?: string }>>([]);
  useNavigation(changeLocationToAccount, changeLocationToStandard);

  const router = useRouter();
  const { p, historyType } = router.query as {
    p?: number;
    historyType?: RqHistoryType;
  };
  const [paginationCurrentPage, setPaginationCurrentPage] = useState(1);
  const [paginationCount, setPaginationCount] = useState(1);

  const handlePagination = (value: number) => {
    router.push({
      pathname: "/account/rg-history",
      query: {
        historyType: historyType ? historyType : "LIMITS",
        ...(value !== 1 && { p: value }),
      },
    });
  };

  const historyApiArgument = {
    query: {
      pagination: {
        currentPage: p ? p : 1,
      },
    },
  };

  useEffect(() => {
    historyType === RgHistoryQueryEnum.COOL_OFF
      ? coolOffHistoryApi.triggerApi(undefined, historyApiArgument)
      : triggerApi(undefined, historyApiArgument);
  }, [p, historyType]);

  useEffect(() => {
    router.push({
      pathname: "/account/rg-history",
      query: {
        historyType: "LIMITS",
      },
    });
  }, []);

  interface RgHistoryElement {
    limitType?: string;
    period?: string;
    limit?: string;
    coolOffCause?: string;
    requestedAt?: string;
    effectiveFrom?: string;
    coolOffStart?: string;
    coolOffEnd?: string;
  }

  const normalizeData = (data: RgHistoryElement[]) =>
    data.map((el: RgHistoryElement, idx: number) => ({
      key: idx,
      ...(el.limitType && { LIMIT_TYPE: t(el.limitType) }),
      ...(el.period && { PERIOD: t(el.period) }),
      ...(el.limit && { LIMIT: t(el.limit) }),
      ...(el.coolOffCause && { REASON: t(el.coolOffCause) }),
      ...(el.requestedAt && {
        REQUESTED_AT: getTimeWithTimezone(el.requestedAt).format(
          t("common:DATE_TIME_FORMAT"),
        ),
      }),
      ...(el.effectiveFrom && {
        EFFECTIVE_FROM: getTimeWithTimezone(el.effectiveFrom).format(
          t("common:DATE_TIME_FORMAT"),
        ),
      }),

      ...(el.coolOffStart && {
        COOL_OFF_START: getTimeWithTimezone(el.coolOffStart).format(
          t("common:DATE_TIME_FORMAT"),
        ),
      }),
      ...(el.coolOffEnd && {
        COOL_OFF_END: getTimeWithTimezone(el.coolOffEnd).format(
          t("common:DATE_TIME_FORMAT"),
        ),
      }),
    }));

  const historyData =
    historyType === RgHistoryQueryEnum.COOL_OFF ? coolOffHistoryApi.data : data;

  useEffect(() => {
    if (historyData) {
      setTableData(normalizeData(historyData.data));
      setPaginationCount(
        Math.ceil(historyData.totalCount / historyData.itemsPerPage) * 10,
      );
      setPaginationCurrentPage(historyData.currentPage);
      historyType === RgHistoryQueryEnum.COOL_OFF
        ? coolOffHistoryApi.resetHookState
        : resetHookState();
    }
  }, [historyData]);

  useEffect(() => {
    if (error) {
      message.error(t("GET_ERROR"));
      resetHookState();
    }
  }, [error]);

  const { TabPane } = Tabs;

  const handleTabClick = (name: string) => {
    router.push({
      pathname: "/account/rg-history",
      query: {
        historyType: name,
      },
    });
  };

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <StyledTitle>{t("TITLE")}</StyledTitle>
      <StyledTabs
        activeKey={historyType}
        defaultActiveKey="LIMITS"
        onTabClick={handleTabClick}
      >
        <TabPane tab={t("LIMITS_TAB")} key={RgHistoryQueryEnum.LIMITS}>
          <RgHistoryTable
            data={tableData}
            isLoading={isLoading}
            paginationConfig={{
              current: paginationCurrentPage,
              total: paginationCount,
              onChange: handlePagination,
            }}
            type={RgHistoryQueryEnum.LIMITS}
          />
        </TabPane>
        <TabPane tab={t("COOL_OFF_TAB")} key={RgHistoryQueryEnum.COOL_OFF}>
          <RgHistoryTable
            data={tableData}
            isLoading={isLoading}
            paginationConfig={{
              current: paginationCurrentPage,
              total: paginationCount,
              onChange: handlePagination,
            }}
            type={RgHistoryQueryEnum.COOL_OFF}
          />
        </TabPane>
      </StyledTabs>
    </>
  );
}

RgHistory.namespacesRequired = [...defaultNamespaces, "rg-history"];

export default RgHistory;
