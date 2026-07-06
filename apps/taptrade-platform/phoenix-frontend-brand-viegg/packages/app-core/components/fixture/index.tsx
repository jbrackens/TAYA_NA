import React from "react";
import {
  FixtureMarketsSurface,
  FixtureMarketsGrid,
  FixtureMarketSection,
  FixtureMarketSectionHeader,
  FixtureMarketSectionTitle,
  FixtureMarketSectionCount,
  FixtureMarketList,
  FixtureMarketCard,
  FixtureMarketMeta,
  FixtureMarketName,
  FixtureMarketSpecifier,
  FixtureMarketButtonGrid,
  FixtureMarketEmptyState,
} from "./index.styled";
import { BetButtonComponent } from "../../components/bet-button";
import {
  Markets,
  MarketArrayValue,
  SelectionOdds,
} from "../../components/pages/fixture";
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

const renderSpecifierLabel = (market: MarketArrayValue): string | null => {
  const parts: string[] = [];

  if (market.marketType && market.marketType !== market.marketName) {
    parts.push(market.marketType.replace(/_/g, " "));
  }

  if (market.specifiers?.map) {
    parts.push(`Map ${market.specifiers.map}`);
  }

  if (market.specifiers?.value) {
    const valueSuffix = market.specifiers?.unit
      ? `${market.specifiers.value} ${market.specifiers.unit}`
      : `${market.specifiers.value}`;
    parts.push(valueSuffix);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" • ");
};

const resolveColumnCount = (market: MarketArrayValue): number => {
  const hasDraw = market.selectionOdds.some(
    (selection) => selection.selectionName === SelectionName.DRAW,
  );

  if (hasDraw) {
    return 3;
  }

  if (market.selectionOdds.length >= 3) {
    return 3;
  }

  return 2;
};

const FixtureComponent: React.FC<Props> = ({
  markets,
  fixtureName,
  competitors,
  fixtureStatus,
  fixtureId,
  sportId,
}) => {
  const renderSelectionButton = (
    market: MarketArrayValue,
    selection: SelectionOdds,
  ) => (
    <BetButtonComponent
      brandMarketId={market.marketId}
      marketName={market.marketName}
      fixtureName={fixtureName}
      selectionId={String(selection.selectionId)}
      selectionName={String(selection.selectionName)}
      specifiers={market.specifiers}
      odds={selection.displayOdds}
      competitors={competitors}
      selectionMarketStatus={market.marketStatus.type}
      status={fixtureStatus}
      fixtureId={fixtureId}
      sportId={sportId}
    />
  );

  const renderBetButtons = (market: MarketArrayValue) => {
    const home = market.selectionOdds.find(
      (selection) => selection.selectionName === SelectionName.HOME,
    );
    const away = market.selectionOdds.find(
      (selection) => selection.selectionName === SelectionName.AWAY,
    );
    const draw = market.selectionOdds.find(
      (selection) => selection.selectionName === SelectionName.DRAW,
    );

    if (home && away) {
      return (
        <FixtureMarketButtonGrid $columns={resolveColumnCount(market)}>
          <div key={`${market.marketId}-${home.selectionId}`}>
            {renderSelectionButton(market, home)}
          </div>
          {draw ? (
            <div key={`${market.marketId}-${draw.selectionId}`}>
              {renderSelectionButton(market, draw)}
            </div>
          ) : null}
          <div key={`${market.marketId}-${away.selectionId}`}>
            {renderSelectionButton(market, away)}
          </div>
        </FixtureMarketButtonGrid>
      );
    }

    return (
      <FixtureMarketButtonGrid $columns={resolveColumnCount(market)}>
        {market.selectionOdds.map((selection) => (
          <div key={`${market.marketId}-${selection.selectionId}`}>
            {renderSelectionButton(market, selection)}
          </div>
        ))}
      </FixtureMarketButtonGrid>
    );
  };

  if (!markets.length) {
    return (
      <FixtureMarketsSurface>
        <FixtureMarketEmptyState>
          No markets are available for this fixture yet.
        </FixtureMarketEmptyState>
      </FixtureMarketsSurface>
    );
  }

  return (
    <FixtureMarketsSurface>
      <FixtureMarketsGrid>
        {markets.map((marketGroup) =>
          Object.entries(marketGroup).map(([sectionTitle, sectionMarkets]) => (
            <FixtureMarketSection key={sectionTitle}>
              <FixtureMarketSectionHeader>
                <FixtureMarketSectionTitle>{sectionTitle}</FixtureMarketSectionTitle>
                <FixtureMarketSectionCount>
                  {sectionMarkets.length}
                </FixtureMarketSectionCount>
              </FixtureMarketSectionHeader>
              <FixtureMarketList>
                {sectionMarkets.map((market) => {
                  const specifierLabel = renderSpecifierLabel(market);
                  return (
                    <FixtureMarketCard key={market.marketId}>
                      <FixtureMarketMeta>
                        <FixtureMarketName>{market.marketName}</FixtureMarketName>
                        {specifierLabel ? (
                          <FixtureMarketSpecifier>
                            {specifierLabel}
                          </FixtureMarketSpecifier>
                        ) : null}
                      </FixtureMarketMeta>
                      {renderBetButtons(market)}
                    </FixtureMarketCard>
                  );
                })}
              </FixtureMarketList>
            </FixtureMarketSection>
          )),
        )}
      </FixtureMarketsGrid>
    </FixtureMarketsSurface>
  );
};

export { FixtureComponent };
