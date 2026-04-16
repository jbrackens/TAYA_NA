import Head from "next/head";
import { defaultNamespaces } from "../defaults";
import { useEffect, useState, useRef } from "react";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import {
  Subtitle,
  EmptyDataContainer,
  DropdownsContainer,
} from "./index.styled";
import { WinLossStatisticsList } from "../../win-loss-statistics-list";
import { useRouter } from "next/router";
import {
  BetOutcomeEnum,
  BetDetail,
  useNavigation,
  BetStatusEnum,
  useTimezone,
} from "@phoenix-ui/utils";
import { useSelector } from "react-redux";
import { getUserBets } from "../../../services/go-api";
import { transformGoUserBetsResponse } from "../../../services/go-api/betting/betting-transforms";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { StyledPagination } from "../../../components/pagination/index.styled";
import { StyledTitle } from "../account/index.styled";
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

type WinLossFilter = BetOutcomeEnum | BetStatusEnum;

function WinLosStatistics() {
  useNavigation(changeLocationToAccount, changeLocationToStandard);
  const [winLossStatistics, setWinLossStatistics] = useState<Array<BetDetail>>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [paginationCount, setPaginationCount] = useState(1);
  const [paginationCurrentPage, setPaginationCurrentPage] = useState(1);
  const { t } = useTranslation(["win-loss-statistics"]);
  const elementToScrollTo = useRef<HTMLDivElement>(null);
  const { Option, OptionContent } = CoreSelect;
  const router = useRouter();
  const userId: string = useSelector(
    (state: any) => state.settings.userData.userId,
  );
  const { range, type, p } = router.query as {
    range?: TimeFIlterEnum;
    type?: WinLossFilter;
    p?: string;
  };

  const [hasTypeSelectInitialValue, setHasTypeSelectInitialValue] = useState(
    false,
  );

  const [hasRangeSelectInitialValue, setHasRangeSelectInitialValue] = useState(
    false,
  );

  // Data is fetched directly in the effect below (replaces useApi)

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

  const generateStartDate = () => {
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

  const mapTypeFilterToStatus = (
    filter?: WinLossFilter,
  ): string | undefined => {
    switch (filter) {
      case BetOutcomeEnum.WON:
        return "won";
      case BetOutcomeEnum.LOST:
        return "lost";
      case BetStatusEnum.OPEN:
        return "matched";
      case BetStatusEnum.PUSHED:
        return "pushed";
      case BetStatusEnum.VOIDED:
        return "voided";
      case BetStatusEnum.CANCELLED:
      case BetOutcomeEnum.CANCELLED:
        return "cancelled";
      default:
        return undefined;
    }
  };

  const buildBetHistoryQuery = () => {
    const startDate = generateStartDate();
    return {
      status: mapTypeFilterToStatus(type),
      ...(startDate ? { start_date: startDate } : {}),
      ...(startDate
        ? {
            end_date: getTimeWithTimezone(new Date()).format(
              "YYYY-MM-DDTHH:mm:ssZ",
            ),
          }
        : {}),
      page: p ? Number(p) : 1,
      limit: 20,
    };
  };

  useEffect(() => {
    if (!userId) return;

    const fetchBets = async () => {
      setIsLoading(true);
      try {
        const goResponse = await getUserBets(userId, buildBetHistoryQuery());
        const transformed = transformGoUserBetsResponse(goResponse);
        setWinLossStatistics(transformed.data);
        setPaginationCount(
          Math.ceil(transformed.totalCount / transformed.itemsPerPage) * 10,
        );
        setPaginationCurrentPage(transformed.currentPage);
      } catch (err) {
        console.error("Failed to fetch bet history:", err);
        setWinLossStatistics([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBets();
  }, [range, type, p, userId]);

  const handleTimeFilter = (value: any) => {
    !hasRangeSelectInitialValue && setHasRangeSelectInitialValue(true);

    if (value === "all") {
      router.push(
        {
          query: {
            ...(type && { type: type }),
          },
        },
        undefined,
        { shallow: true },
      );
      return;
    }
    router.push(
      {
        query: {
          ...(type && { type: type }),
          range: value,
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const handleTypeFilter = (value: any) => {
    !hasTypeSelectInitialValue && setHasTypeSelectInitialValue(true);

    if (value === "all") {
      router.push(
        {
          query: {
            ...(range && { range }),
          },
        },
        undefined,
        { shallow: true },
      );
      return;
    }
    router.push(
      {
        query: {
          type: value,
          ...(range && { range }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const handlePagination = (value: number) => {
    if (elementToScrollTo?.current) {
      elementToScrollTo.current.scrollIntoView();
    }
    router.push(
      {
        query: {
          ...(type && { type: type }),
          ...(range && { range }),
          ...(value !== 1 && { p: value }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  return (
    <>
      <Head>
        <title>{t("BET_HISTORY")}</title>
      </Head>
      <>
        <DropdownsContainer ref={elementToScrollTo} gutter={[10, 10]}>
          <Col span={24}>
            <StyledTitle $subtitleexists>{t("BET_HISTORY")}</StyledTitle>
          </Col>
          <Col xl={14} md={24} sm={24} xs={24}>
            <Subtitle level={3}>{t("WIN_AND_LOSS_STATISTICS")}</Subtitle>
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
                onChange={handleTypeFilter}
                value={!hasTypeSelectInitialValue || type ? type : "all"}
                placeholder={t("STATUS")}
              >
                <Option value={"all"}>
                  <OptionContent>{t("ALL")}</OptionContent>
                </Option>

                <Option value={BetOutcomeEnum.WON}>
                  <OptionContent>{t("WON")}</OptionContent>
                </Option>

                <Option value={BetOutcomeEnum.LOST}>
                  <OptionContent>{t("LOST")}</OptionContent>
                </Option>

                <Option value={BetStatusEnum.OPEN}>
                  <OptionContent>{t("OPEN")}</OptionContent>
                </Option>

                <Option value={BetStatusEnum.PUSHED}>
                  <OptionContent>{t("PUSHED")}</OptionContent>
                </Option>

                <Option value={BetStatusEnum.VOIDED}>
                  <OptionContent>{t("VOIDED")}</OptionContent>
                </Option>

                <Option value={BetStatusEnum.CANCELLED}>
                  <OptionContent>{t("CANCELLED")}</OptionContent>
                </Option>
              </CoreSelect>
            </SelectContainer>
          </Col>
        </DropdownsContainer>
        <Row>
          <Col span={24}>
            {winLossStatistics.length > 0 || isLoading ? (
              <WinLossStatisticsList
                isLoading={isLoading}
                winLossStatistics={winLossStatistics}
              />
            ) : (
              <EmptyDataContainer>{t("BET_HISTORY_EMPTY")}</EmptyDataContainer>
            )}
          </Col>
          <Col span={24}></Col>
          <Col span={winLossStatistics.length > 0 ? 24 : 0}>
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

WinLosStatistics.namespacesRequired = [
  ...defaultNamespaces,
  "win-loss-statistics",
];

export default WinLosStatistics;
