import Head from "next/head";
import { defaultNamespaces } from "../defaults";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import { useApi } from "../../../services/api/api-service";
import React, { useEffect, useState, useRef } from "react";
import TransactionHistoryList from "../../transaction-history-list";
import { useRouter } from "next/router";
import {
  WalletActionType,
  WalletActionTypeEnum,
  WalletHistoryActionElement,
  useNavigation,
  useTimezone,
} from "@phoenix-ui/utils";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { DropdownsContainer, SecondaryTitleLink } from "./index.styled";
import { StyledPagination } from "../../../components/pagination/index.styled";
import { StyledTitle } from "../../../components/pages/account/index.styled";
import { CoreSelect } from "../../ui/select";
import { SelectContainer } from "../../ui/form/index.styled";

export enum TimeFIlterEnum {
  LAST_YEAR = "lastYear",
  LAST_24_HOURS = "last24Hours",
  LAST_WEEK = "lastWeek",
  LAST_MONTH = "lastMonth",
  LAST_3_MONTHS = "last3Months",
  LAST_6_MONTHS = "last6Months",
  LAST_12_MONTHS = "last12Months",
}

function TransactionHistory() {
  useNavigation(changeLocationToAccount, changeLocationToStandard);

  const { Option, OptionContent } = CoreSelect;
  const { t } = useTranslation(["transaction-history"]);
  const { data, isLoading, triggerApi } = useApi(
    "punters/wallet/transactions",
    "GET",
  );
  const [paginationCount, setPaginationCount] = useState(1);
  const [paginationCurrentPage, setPaginationCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState<
    Array<WalletHistoryActionElement>
  >([]);
  const router = useRouter();
  const { range, category: type, p } = router.query as {
    range?: TimeFIlterEnum;
    category?: WalletActionType;
    p?: number;
  };
  const elementToScrollTo = useRef<HTMLDivElement>(null);

  const [hasTypeSelectInitialValue, setHasTypeSelectInitialValue] = useState(
    false,
  );

  const [hasRangeSelectInitialValue, setHasRangeSelectInitialValue] = useState(
    false,
  );

  const lastYear = new Date(
    new Date().setFullYear(new Date().getFullYear() - 1),
  );
  const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(new Date().setDate(new Date().getDate() - 7));
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1));
  const last3Months = new Date(new Date().setMonth(new Date().getMonth() - 3));
  const last6Months = new Date(new Date().setMonth(new Date().getMonth() - 6));
  const last12Months = new Date(
    new Date().setMonth(new Date().getMonth() - 12),
  );

  const { getTimeWithTimezone } = useTimezone();

  const generateDate = () => {
    switch (range) {
      case TimeFIlterEnum.LAST_YEAR:
        return getTimeWithTimezone(lastYear).format("YYYY-MM-DDTHH:mm:ssZ");

      case TimeFIlterEnum.LAST_24_HOURS:
        return getTimeWithTimezone(yesterday).format("YYYY-MM-DDTHH:mm:ssZ");

      case TimeFIlterEnum.LAST_WEEK:
        return getTimeWithTimezone(lastWeek).format("YYYY-MM-DDTHH:mm:ssZ");

      case TimeFIlterEnum.LAST_MONTH:
        return getTimeWithTimezone(lastMonth).format("YYYY-MM-DDTHH:mm:ssZ");

      case TimeFIlterEnum.LAST_3_MONTHS:
        return getTimeWithTimezone(last3Months).format("YYYY-MM-DDTHH:mm:ssZ");

      case TimeFIlterEnum.LAST_6_MONTHS:
        return getTimeWithTimezone(last6Months).format("YYYY-MM-DDTHH:mm:ssZ");

      case TimeFIlterEnum.LAST_12_MONTHS:
        return getTimeWithTimezone(last12Months).format("YYYY-MM-DDTHH:mm:ssZ");
    }
  };

  useEffect(() => {
    if (data) {
      setTransactions(data.data);
      setPaginationCount(Math.ceil(data.totalCount / data.itemsPerPage) * 10);
      setPaginationCurrentPage(data.currentPage);
    }
  }, [data]);

  useEffect(() => {
    triggerApi(undefined, {
      query: {
        pagination: {
          currentPage: p ? p : 1,
        },
        filters: {
          ...(type && { category: type }),
          ...(range && { since: generateDate() }),
        },
      },
    });
  }, [range, type, p]);

  const handleTimeFilter = (value: any) => {
    !hasRangeSelectInitialValue && setHasRangeSelectInitialValue(true);

    if (value === "all") {
      router.push({
        pathname: "/account/transactions",
        query: {
          ...(type && { category: type }),
        },
      });
      return;
    }
    router.push({
      pathname: "/account/transactions",
      query: {
        ...(type && { category: type }),
        range: value,
      },
    });
  };

  const handleTypeFilter = (value: any) => {
    !hasTypeSelectInitialValue && setHasTypeSelectInitialValue(true);

    if (value === "all") {
      router.push({
        pathname: "/account/transactions",
        query: {
          ...(range && { range }),
        },
      });
      return;
    }
    router.push({
      pathname: "/account/transactions",
      query: {
        category: value,
        ...(range && { range }),
      },
    });
  };

  const handlePagination = (value: number) => {
    if (elementToScrollTo?.current) {
      elementToScrollTo.current.scrollIntoView();
    }
    router.push({
      pathname: "/account/transactions",
      query: {
        ...(type && { category: type }),
        ...(range && { range }),
        ...(value !== 1 && { p: value }),
      },
    });
  };

  return (
    <>
      <Head>
        <title>{t("TRANSACTION_HISTORY")}</title>
      </Head>
      <>
        <DropdownsContainer ref={elementToScrollTo}>
          <Col span={24}>
            <StyledTitle $subtitleexists={true}>
              {t("TRANSACTION_HISTORY")}
            </StyledTitle>
          </Col>
          <Col xl={14} md={24} sm={24} xs={24}>
            <SecondaryTitleLink
              onClick={() => router.push("/account/rg-history/")}
            >
              {t("RESPONSIBLE_GAMING_HISTORY")}
            </SecondaryTitleLink>
          </Col>
          <Col xl={5} md={12} sm={12} xs={12}>
            <SelectContainer>
              <CoreSelect
                dropdownStyle={{ backgroundColor: "transparent" }}
                value={!hasRangeSelectInitialValue || range ? range : "all"}
                onChange={handleTimeFilter}
                placeholder={t("DATE_RANGE")}
              >
                <Option value={"all"}>
                  <OptionContent>{t("ALL")}</OptionContent>
                </Option>
                <Option value={TimeFIlterEnum.LAST_24_HOURS}>
                  <OptionContent>{t("LAST_24_HOURS")}</OptionContent>
                </Option>
                <Option value={TimeFIlterEnum.LAST_WEEK}>
                  <OptionContent>{t("LAST_WEEK")}</OptionContent>
                </Option>
                <Option value={TimeFIlterEnum.LAST_MONTH}>
                  <OptionContent>{t("LAST_MONTH")}</OptionContent>
                </Option>
                <Option value={TimeFIlterEnum.LAST_3_MONTHS}>
                  <OptionContent>{t("LAST_3_MONTHS")}</OptionContent>
                </Option>
                <Option value={TimeFIlterEnum.LAST_6_MONTHS}>
                  <OptionContent>{t("LAST_6_MONTHS")}</OptionContent>
                </Option>
                <Option value={TimeFIlterEnum.LAST_12_MONTHS}>
                  <OptionContent>{t("LAST_12_MONTHS")}</OptionContent>
                </Option>
              </CoreSelect>
            </SelectContainer>
          </Col>
          <Col xl={5} md={12} sm={12} xs={12}>
            <SelectContainer>
              <CoreSelect
                dropdownStyle={{ backgroundColor: "transparent" }}
                value={!hasTypeSelectInitialValue || type ? type : "all"}
                onChange={handleTypeFilter}
                placeholder={t("STATUS")}
              >
                <Option value={"all"}>
                  <OptionContent>{t("ALL")}</OptionContent>
                </Option>
                <Option value={WalletActionTypeEnum.DEPOSIT}>
                  <OptionContent>{t("DEPOSIT")}</OptionContent>
                </Option>
                <Option value={WalletActionTypeEnum.WITHDRAWAL}>
                  <OptionContent>{t("WITHDRAWAL")}</OptionContent>
                </Option>
                <Option value={WalletActionTypeEnum.BET_PLACEMENT}>
                  <OptionContent>{t("BET_PLACEMENT")}</OptionContent>
                </Option>
                <Option value={WalletActionTypeEnum.BET_SETTLEMENT}>
                  <OptionContent>{t("BET_SETTLEMENT")}</OptionContent>
                </Option>
              </CoreSelect>
            </SelectContainer>
          </Col>
        </DropdownsContainer>
        <Row>
          <Col span={24}>
            <TransactionHistoryList
              transactions={transactions}
              isLoading={isLoading}
            />
          </Col>
          <Col span={transactions.length > 0 ? 24 : 0}>
            <StyledPagination
              current={paginationCurrentPage}
              total={paginationCount}
              onChange={handlePagination}
              showSizeChanger={false}
            />
          </Col>
        </Row>
      </>
    </>
  );
}

TransactionHistory.namespacesRequired = [
  "transaction-history",
  "language-time-zones",
  ...defaultNamespaces,
];

export default TransactionHistory;
