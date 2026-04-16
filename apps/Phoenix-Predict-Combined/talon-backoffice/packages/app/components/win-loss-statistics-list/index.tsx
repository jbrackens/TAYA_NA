import React, { useState } from "react";
import {
  BetDetail,
  BetPart,
  BetOutcomeEnum,
  BetTypeEnum,
  BetOutcome,
  BetStatus,
  BetStatusEnum,
  useTimezone,
} from "@phoenix-ui/utils";
import {
  BetDetailsListItem,
  NameCell,
  WinLossTable,
  ValueCell,
  DynamicTableRow,
  ListHeaderContainer,
  ResultContainer,
  CollapseButton,
  CustomCollapse,
  BetPartListItem,
  StyledUl,
  DivPaddingBottom,
  DateContainer,
  DivDisplayFlex,
  BetPartFooter,
  DivPaddingRight,
  PlValueContainer,
  MobileResultContainer,
  BetPartResultContainer,
  CustomDivider,
  ResultCol,
  SelectionContainer,
  LegOddContainer,
  RowPaddingBottom,
  PlValue,
  PeriodName,
  MarketName,
  OddsNameContainer,
  BetPartValue,
  CancelledStatusTag,
  VoidedStatusTag,
  OpenStatusTag,
  LostResultTag,
  WonResultTag,
  CenteredSpin,
  StakeAndResultContainer,
} from "../pages/win-loss-statistics/index.styled";
import { useTranslation } from "i18n";
import { Collapse, Row, Col, Divider } from "antd";
import { AvatarComponent } from "../avatar";
import { useCurrency } from "../../services/currency";
import { useSelector } from "react-redux";
import { selectOddsFormat } from "../../lib/slices/settingsSlice";

type WinLossStatisticsListProps = {
  isLoading: boolean;
  winLossStatistics: Array<BetDetail>;
};

const WinLossStatisticsList: React.FC<WinLossStatisticsListProps> = ({
  isLoading,
  winLossStatistics,
}) => {
  const [collapsedBetDetailsId, setCollapsedBetDetailsId] = useState<
    Array<string>
  >([]);
  const { t } = useTranslation(["win-loss-statistics"]);
  const { Panel } = Collapse;
  const { formatCurrencyValue } = useCurrency();
  const collapseButtonOnClick = (betId: string) =>
    setCollapsedBetDetailsId((prev) =>
      prev.includes(betId)
        ? prev.filter((el) => el !== betId)
        : [...prev, betId],
    );
  const oddsFormat = useSelector(selectOddsFormat);

  const generateSportIcons = (sports: Array<{ id: string; name: string }>) =>
    sports.map((sport) => (
      <span key={sport.id} style={{ marginRight: "10px" }}>
        <AvatarComponent id={sport.id} shape="square" type="sports" size={25} />
      </span>
    ));

  const generatePlValue = (el: BetDetail) => {
    const isLoss = el.outcome === BetOutcomeEnum.LOST;
    const isCancelled = el.outcome === BetOutcomeEnum.CANCELLED;
    if (el.profitLoss === undefined || el.profitLoss === 0) {
      return <PlValue>{formatCurrencyValue(0)}</PlValue>;
    }
    return (
      <PlValueContainer isPositive={!isLoss}>
        {isCancelled ? "" : isLoss ? "-" : "+"}
        {formatCurrencyValue(el.profitLoss) || formatCurrencyValue(0)}
      </PlValueContainer>
    );
  };

  //to change for multibets
  const generateResultTag = (result: BetOutcome, status: BetStatus) => {
    switch (status) {
      case BetStatusEnum.CANCELLED:
        return <CancelledStatusTag>{t("CANCELLED")}</CancelledStatusTag>;
      case BetStatusEnum.VOIDED:
        return <VoidedStatusTag>{t("VOIDED")}</VoidedStatusTag>;
      case BetStatusEnum.PUSHED:
        return <VoidedStatusTag>{t("PUSHED")}</VoidedStatusTag>;
      case BetStatusEnum.OPEN:
        return <OpenStatusTag>{t("OPEN")}</OpenStatusTag>;
    }
    switch (result) {
      case BetOutcomeEnum.LOST:
        return <LostResultTag>{t("LOST")}</LostResultTag>;

      case BetOutcomeEnum.WON:
        return <WonResultTag>{t("WON")}</WonResultTag>;
    }
  };

  const { getTimeWithTimezone } = useTimezone();
  const generateItemTime = (date: string) =>
    getTimeWithTimezone(date).format("lll");

  const generateDetailsTable = (el: BetDetail) => (
    <Row>
      <Col xxl={12} xl={12} lg={12} md={12} sm={24} xs={24}>
        <WinLossTable>
          <tbody>
            <DynamicTableRow>
              <NameCell>{t("BET_TYPE")}</NameCell>
              <ValueCell isBold={true} role={"betType"}>
                {el.betType}
              </ValueCell>
            </DynamicTableRow>
            <DynamicTableRow>
              <NameCell>{t("PLACED_DATE_TIME")}</NameCell>
              <ValueCell isBold={true} role={"placedDateTime"}>
                {el.placedAt !== undefined
                  ? generateItemTime(el.placedAt)
                  : "-"}
              </ValueCell>
            </DynamicTableRow>
            <DynamicTableRow>
              <NameCell>{t("ODDS")}</NameCell>
              <ValueCell isBold={true} role={"odds"}>
                {el.displayOdds ? el.displayOdds[oddsFormat] : "-"}
              </ValueCell>
            </DynamicTableRow>
          </tbody>
        </WinLossTable>
      </Col>
      <Col xxl={12} xl={12} lg={12} md={12} sm={24} xs={24}>
        <WinLossTable>
          <tbody>
            <DynamicTableRow>
              <NameCell>{t("STAKE")}</NameCell>
              <ValueCell isBold={true} role={"stake"}>
                <StakeAndResultContainer>
                  {formatCurrencyValue(el.stake.amount)}
                  <MobileResultContainer>
                    {generateResultTag(el.outcome, el.legs[0].status)}
                  </MobileResultContainer>
                </StakeAndResultContainer>
              </ValueCell>
            </DynamicTableRow>
            <DynamicTableRow>
              <NameCell>{t("P_L")}</NameCell>
              <ValueCell role={"pL"}>{generatePlValue(el)}</ValueCell>
            </DynamicTableRow>
            <DynamicTableRow>
              <NameCell>{t("SPORT")}</NameCell>
              <ValueCell>{generateSportIcons(el.sports)}</ValueCell>
            </DynamicTableRow>
            <DynamicTableRow>
              <NameCell>{t("BET_ID")}</NameCell>
              <ValueCell role={"betId"}>{el.betId}</ValueCell>
            </DynamicTableRow>
          </tbody>
        </WinLossTable>
      </Col>
    </Row>
  );

  const generateBetPartListItems = (legs: Array<BetPart>, id: string) => {
    return legs.map((leg) => (
      <BetPartListItem key={leg.id}>
        <Row>
          <ResultCol xxl={0} xl={0} lg={0} md={0} sm={24} xs={24}>
            <BetPartResultContainer>
              {/* {generateResultTag(leg.outcome)} */}
            </BetPartResultContainer>
          </ResultCol>
          <Col xxl={12} xl={12} lg={12} md={12} sm={24} xs={24}>
            <RowPaddingBottom align={"middle"}>
              <AvatarComponent
                id={leg.sport.id}
                shape="square"
                type="sports"
                size={25}
              />
              <DivPaddingBottom>
                {leg.tournament.name} {<br />}
                {leg.fixture.name}
              </DivPaddingBottom>
            </RowPaddingBottom>
            <span>
              <PeriodName>{t("EVENT_TIME")}</PeriodName>{" "}
              {leg.fixture.startTime !== undefined ? (
                <DateContainer>
                  {generateItemTime(leg.fixture.startTime)}
                </DateContainer>
              ) : (
                <DateContainer>"-"</DateContainer>
              )}
            </span>
          </Col>

          <Col xxl={12} xl={12} lg={12} md={12} sm={24} xs={24}>
            <Row gutter={[10, 5]}>
              <Col xxl={8} xl={8} lg={8} md={8} sm={24} xs={24}>
                <MarketName role={"marketName"}>{leg.market.name}</MarketName>
                <SelectionContainer role={"selectionName"}>
                  {leg.selection.name}
                </SelectionContainer>
              </Col>
              <Col xxl={8} xl={8} lg={8} md={8} sm={24} xs={24}>
                <OddsNameContainer>{t("ODDS")}</OddsNameContainer>
                {<br />}
                <LegOddContainer role={"legOdds"}>
                  {leg.displayOdds ? leg.displayOdds[oddsFormat] : "-"}
                </LegOddContainer>
              </Col>
              <ResultCol xxl={8} xl={8} lg={8} md={8} sm={0} xs={0}>
                <BetPartResultContainer>
                  {/* {generateResultTag(leg.outcome)} */}
                </BetPartResultContainer>
              </ResultCol>
              <Col xxl={8} xl={8} lg={8} md={8} sm={8} xs={8}>
                <PeriodName>{t("SETTLED_BET")}</PeriodName>
              </Col>
              <Col
                xxl={16}
                xl={16}
                lg={16}
                md={16}
                sm={24}
                xs={24}
                role={"settledBet"}
              >
                <DateContainer>
                  {leg.placedAt !== undefined
                    ? generateItemTime(leg.placedAt)
                    : "-"}
                </DateContainer>
              </Col>
            </Row>
          </Col>
        </Row>
        <CustomDivider />
        <BetPartResultContainer>
          <BetPartFooter>
            <DivDisplayFlex>
              <DivPaddingRight>{t("BET_PART")}</DivPaddingRight>
              <BetPartValue>{id}</BetPartValue>
            </DivDisplayFlex>
          </BetPartFooter>
        </BetPartResultContainer>
      </BetPartListItem>
    ));
  };

  const generateBetDetailListItems = () => {
    return winLossStatistics.map((el) => (
      <BetDetailsListItem key={el.betId}>
        <ListHeaderContainer>
          <span>{t("BET_DETAILS")}</span>
          <ResultContainer>
            {generateResultTag(el.outcome, el.legs[0].status)}
          </ResultContainer>
        </ListHeaderContainer>
        {generateDetailsTable(el)}
        {el.betType === BetTypeEnum.MULTI ? (
          <CollapseButton
            block
            onClick={() => collapseButtonOnClick(el.betId)}
            role={"collapseButton"}
            id="collapseButton"
          >
            {t(
              `${
                collapsedBetDetailsId.includes(el.betId) ? "HIDE" : "SHOW"
              }_BET_DETAILS`,
            )}
          </CollapseButton>
        ) : (
          <Divider />
        )}
        <CustomCollapse
          activeKey={
            el.betType === BetTypeEnum.SINGLE ? el.betId : collapsedBetDetailsId
          }
        >
          <Panel header="" key={el.betId} showArrow={false}>
            {generateBetPartListItems(el.legs, el.betId)}
          </Panel>
        </CustomCollapse>
      </BetDetailsListItem>
    ));
  };

  return (
    <>
      {isLoading ? (
        <CenteredSpin />
      ) : (
        <StyledUl> {generateBetDetailListItems()} </StyledUl>
      )}
    </>
  );
};

export { WinLossStatisticsList };
