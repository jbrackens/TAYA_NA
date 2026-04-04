import Head from "next/head";
import { defaultNamespaces } from "../defaults";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import React, { useMemo, useRef, useState } from "react";
import TransactionHistoryList from "../../transaction-history-list";
import { useRouter } from "next/router";
import {
  WalletActionType,
  WalletActionTypeEnum,
  WalletProduct,
  WalletProductEnum,
  useNavigation,
  useTimezone,
} from "@phoenix-ui/utils";
import { useTransactions } from "../../../services/go-api";
import {
  mapWalletActionTypeToGoTransactionType,
  mapWalletProductToGoTransactionProduct,
  transformGoTransactionsResponse,
} from "../../../services/go-api/wallet/wallet-transforms";
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
  const router = useRouter();
  const { range, category: type, product, p } = router.query as {
    range?: TimeFIlterEnum;
    category?: WalletActionType;
    product?: WalletProduct;
    p?: string;
  };
  const elementToScrollTo = useRef<HTMLDivElement>(null);

  const [hasTypeSelectInitialValue, setHasTypeSelectInitialValue] = useState(
    false,
  );

  const [hasRangeSelectInitialValue, setHasRangeSelectInitialValue] = useState(
    false,
  );

  const [hasProductSelectInitialValue, setHasProductSelectInitialValue] =
    useState(false);

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
  const currentPage = useMemo(() => {
    const parsed = Number(p);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [p]);

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

  const { data, isLoading } = useTransactions({
    page: currentPage,
    limit: 10,
    type: mapWalletActionTypeToGoTransactionType(type),
    product: mapWalletProductToGoTransactionProduct(product),
    start_date: range ? generateDate() : undefined,
  });

  const transactionPage = useMemo(
    () =>
      data
        ? transformGoTransactionsResponse(data)
        : {
            data: [],
            totalCount: 0,
            itemsPerPage: 10,
            currentPage,
            hasNextPage: false,
          },
    [currentPage, data],
  );

  const handleTimeFilter = (value: any) => {
    !hasRangeSelectInitialValue && setHasRangeSelectInitialValue(true);

    if (value === "all") {
      router.push({
        pathname: "/account/transactions",
        query: {
          ...(type && { category: type }),
          ...(product && { product }),
        },
      });
      return;
    }
    router.push({
      pathname: "/account/transactions",
      query: {
        ...(type && { category: type }),
        ...(product && { product }),
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
          ...(product && { product }),
        },
      });
      return;
    }
    router.push({
      pathname: "/account/transactions",
      query: {
        category: value,
        ...(product && { product }),
        ...(range && { range }),
      },
    });
  };

  const handleProductFilter = (value: any) => {
    !hasProductSelectInitialValue && setHasProductSelectInitialValue(true);

    if (value === "all") {
      router.push({
        pathname: "/account/transactions",
        query: {
          ...(type && { category: type }),
          ...(range && { range }),
        },
      });
      return;
    }

    router.push({
      pathname: "/account/transactions",
      query: {
        ...(type && { category: type }),
        ...(range && { range }),
        product: value,
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
          ...(product && { product }),
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
          <Col xl={12} md={24} sm={24} xs={24}>
            <SecondaryTitleLink
              onClick={() => router.push("/account/rg-history/")}
            >
              {t("RESPONSIBLE_GAMING_HISTORY")}
            </SecondaryTitleLink>
          </Col>
          <Col xl={4} md={8} sm={8} xs={24}>
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
          <Col xl={4} md={8} sm={8} xs={12}>
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
          <Col xl={4} md={8} sm={8} xs={12}>
            <SelectContainer>
              <CoreSelect
                dropdownStyle={{ backgroundColor: "transparent" }}
                value={
                  !hasProductSelectInitialValue || product ? product : "all"
                }
                onChange={handleProductFilter}
                placeholder={t("PRODUCT")}
              >
                <Option value={"all"}>
                  <OptionContent>{t("ALL")}</OptionContent>
                </Option>
                <Option value={WalletProductEnum.SPORTSBOOK}>
                  <OptionContent>{t("SPORTSBOOK")}</OptionContent>
                </Option>
                <Option value={WalletProductEnum.PREDICTION}>
                  <OptionContent>{t("PREDICTION")}</OptionContent>
                </Option>
              </CoreSelect>
            </SelectContainer>
          </Col>
        </DropdownsContainer>
        <Row>
          <Col span={24}>
            <TransactionHistoryList
              transactions={transactionPage.data}
              isLoading={isLoading}
            />
          </Col>
          <Col span={transactionPage.data.length > 0 ? 24 : 0}>
            <StyledPagination
              current={transactionPage.currentPage}
              total={transactionPage.totalCount}
              pageSize={transactionPage.itemsPerPage}
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
