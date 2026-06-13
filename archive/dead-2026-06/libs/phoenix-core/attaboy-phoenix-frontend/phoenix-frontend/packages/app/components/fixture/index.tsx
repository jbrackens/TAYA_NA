import React from "react";
import {
  StyledCol,
  BetButtonCol,
  StyledRow,
  SubTitle,
  BetButtonRow,
  CollapseWrapper,
} from "./index.styled";
import { BetButtonComponent } from "../../components/bet-button";
import {
  Markets,
  MarketArrayValue,
  SelectionOdds,
} from "../../components/pages/fixture";
import { Collapse, Col } from "antd";
import { StyledCollapseComponent } from "../../components/collapse";
import { Competitors } from "../../components/layout/fixture-list";

type Props = {
  markets: Markets;
  fixtureName: string;
  competitors?: Competitors;
  fixtureStatus: string;
  fixtureId: string;
  sportId: string;
};

enum SelectionName {
  HOME = "home",
  AWAY = "away",
  DRAW = "draw",
}

const FixtureComponent: React.FC<Props> = ({
  markets,
  fixtureName,
  competitors,
  fixtureStatus,
  fixtureId,
  sportId,
}) => {
  const generateBetButtonCol = (
    market: MarketArrayValue,
    selection: SelectionOdds,
    isDraw: boolean,
  ) => (
    <BetButtonCol span={isDraw ? 8 : 12}>
      <BetButtonComponent
        brandMarketId={market.marketId}
        marketName={market.marketName}
        fixtureName={fixtureName}
        selectionId={String(selection?.selectionId)}
        selectionName={String(selection?.selectionName)}
        specifiers={market.specifiers}
        odds={selection.displayOdds}
        competitors={competitors}
        selectionMarketStatus={market.marketStatus.type}
        status={fixtureStatus}
        fixtureId={fixtureId}
        sportId={sportId}
      />
    </BetButtonCol>
  );

  const renderBetButtons = (market: MarketArrayValue) => {
    const home = market.selectionOdds.find(
      (el) => el.selectionName === SelectionName.HOME,
    );
    const away = market.selectionOdds.find(
      (el) => el.selectionName === SelectionName.AWAY,
    );
    const draw = market.selectionOdds.find(
      (el) => el.selectionName === SelectionName.DRAW,
    );

    const isDraw = draw !== undefined;

    if (home === undefined || away === undefined) {
      return (
        <React.Fragment key={market.marketId}>
          {market.selectionOdds.map((selectionOdd, index) => (
            <BetButtonCol key={index} span={12}>
              <BetButtonComponent
                brandMarketId={market.marketId}
                marketName={market.marketName}
                fixtureName={fixtureName}
                selectionId={String(selectionOdd.selectionId)}
                selectionName={String(selectionOdd.selectionName)}
                specifiers={market.specifiers}
                odds={selectionOdd.displayOdds}
                competitors={competitors}
                selectionMarketStatus={market.marketStatus.type}
                status={fixtureStatus}
                fixtureId={fixtureId}
                sportId={sportId}
              />
            </BetButtonCol>
          ))}
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={market.marketId}>
        {generateBetButtonCol(market, home, isDraw)}
        {draw !== undefined && generateBetButtonCol(market, draw, isDraw)}
        {generateBetButtonCol(market, away, isDraw)}
      </React.Fragment>
    );
  };

  const generateSections = () =>
    markets.map((el) =>
      Object.entries(el).map(([key, value]) => (
        <StyledCol xs={24} sm={24} xl={12} key={key}>
          <SubTitle>{key}</SubTitle>
          <BetButtonRow gutter={[10, 10]}>
            {value.map((el) => renderBetButtons(el))}
          </BetButtonRow>
        </StyledCol>
      )),
    );

  const collapseDefaultOpenTab = () => {
    if (markets.length > 0) {
      const firstEl = markets[0];
      return Object.keys(firstEl)[0];
    }
    return "";
  };

  const generateMobileSections = () => {
    return markets.length > 0 ? (
      <CollapseWrapper>
        <StyledCollapseComponent defaultActiveKey={collapseDefaultOpenTab()}>
          {markets.map((el) =>
            Object.entries(el).map(([key, value]) => (
              <Collapse.Panel key={key} header={key}>
                <Col span={24}>
                  <BetButtonRow gutter={[10, 10]}>
                    {value.map((el) => renderBetButtons(el))}
                  </BetButtonRow>
                </Col>
              </Collapse.Panel>
            )),
          )}
        </StyledCollapseComponent>
      </CollapseWrapper>
    ) : (
      <div></div>
    );
  };

  return (
    <>
      <StyledRow>
        {generateSections()}
        {generateMobileSections()}
      </StyledRow>
    </>
  );
};

export { FixtureComponent };
