import betsPageFixture from "./fixtures/bets-page.json";
import fixtureStatsFixture from "./fixtures/fixture-stats.json";
import fixturesPageFixture from "./fixtures/fixtures-page.json";
import freebetsPageFixture from "./fixtures/freebets-page.json";
import matchTrackerFixture from "./fixtures/match-tracker.json";
import oddsBoostsPageFixture from "./fixtures/odds-boosts-page.json";
import walletBalanceFixture from "./fixtures/wallet-balance.json";
import walletTransactionsPageFixture from "./fixtures/wallet-transactions-page.json";
import {
  isBetBuilderAcceptResponse,
  isBetBuilderQuoteResponse,
  isBetDetailsPageResponse,
  isFixtureStatsResponse,
  isFreebetListResponse,
  isFixedExoticAcceptResponse,
  isFixedExoticQuoteResponse,
  isFixtureListPageResponse,
  isMatchTrackerTimelineResponse,
  isOddsBoostListResponse,
  isWalletBalanceResponse,
  isWalletTransactionsPageResponse,
} from "../contracts";

describe("sportsbook API response-shape fixtures", () => {
  test("wallet balance fixture matches contract", () => {
    expect(isWalletBalanceResponse(walletBalanceFixture)).toBe(true);
    if (!isWalletBalanceResponse(walletBalanceFixture)) {
      return;
    }

    expect(walletBalanceFixture.realMoney.value.amount).toBe(125.5);
  });

  test("bet details fixture matches contract", () => {
    expect(isBetDetailsPageResponse(betsPageFixture)).toBe(true);
    if (!isBetDetailsPageResponse(betsPageFixture)) {
      return;
    }

    expect(betsPageFixture.data.length).toBe(1);
    expect(betsPageFixture.data[0].legs[0].market.id).toBe("m:1");
  });

  test("fixture list fixture matches contract", () => {
    expect(isFixtureListPageResponse(fixturesPageFixture)).toBe(true);
    if (!isFixtureListPageResponse(fixturesPageFixture)) {
      return;
    }

    expect(fixturesPageFixture.data[0].fixtureId).toBe("f:100");
    expect(fixturesPageFixture.data[0].tournament.name).toBe(
      "Spring Sweet Spring #2",
    );
  });

  test("wallet transactions fixture matches contract", () => {
    expect(isWalletTransactionsPageResponse(walletTransactionsPageFixture)).toBe(
      true,
    );
    if (!isWalletTransactionsPageResponse(walletTransactionsPageFixture)) {
      return;
    }

    expect(walletTransactionsPageFixture.data[0].transactionId).toBe("tx:1");
  });

  test("guards reject malformed payloads", () => {
    const malformedWalletBalance = {
      ...walletBalanceFixture,
      realMoney: { value: { amount: "125.5" } },
    };
    expect(isWalletBalanceResponse(malformedWalletBalance)).toBe(false);

    const malformedBetsPage = {
      ...betsPageFixture,
      data: [
        {
          ...betsPageFixture.data[0],
          stake: {
            ...betsPageFixture.data[0].stake,
            amount: "10",
          },
        },
      ],
    };
    expect(isBetDetailsPageResponse(malformedBetsPage)).toBe(false);

    const malformedFixturesPage = {
      ...fixturesPageFixture,
      data: fixturesPageFixture.data.map((fixture) => ({
        ...fixture,
        fixtureId: 100,
      })),
    };
    expect(isFixtureListPageResponse(malformedFixturesPage)).toBe(false);

    const malformedTransactionsPage = {
      ...walletTransactionsPageFixture,
      data: walletTransactionsPageFixture.data.map((tx) => ({
        ...tx,
        transactionAmount: {
          ...tx.transactionAmount,
          amount: "5",
        },
      })),
    };
    expect(isWalletTransactionsPageResponse(malformedTransactionsPage)).toBe(
      false,
    );
  });

  test("bet builder quote fixture matches contract", () => {
    const quoteFixture = {
      quoteId: "bbq:local:000001",
      userId: "u-1",
      requestId: "builder-quote-1",
      combinable: true,
      combinedOdds: 3.51,
      impliedProbability: 0.2849,
      status: "open",
      legs: [
        {
          marketId: "m:local:001",
          selectionId: "home",
          fixtureId: "f:local:001",
          requestedOdds: 1.95,
          currentOdds: 1.95,
        },
        {
          marketId: "m:local:002",
          selectionId: "over",
          fixtureId: "f:local:001",
          requestedOdds: 1.8,
          currentOdds: 1.8,
        },
      ],
    };

    expect(isBetBuilderQuoteResponse(quoteFixture)).toBe(true);
  });

  test("bet builder accept response fixture matches contract", () => {
    const responseFixture = {
      bet: {
        betId: "b:local:000001",
        status: "placed",
      },
      quote: {
        quoteId: "bbq:local:000001",
        userId: "u-1",
        requestId: "builder-quote-1",
        combinable: true,
        status: "accepted",
        acceptedBetId: "b:local:000001",
        legs: [
          {
            marketId: "m:local:001",
            selectionId: "home",
            currentOdds: 1.95,
          },
          {
            marketId: "m:local:002",
            selectionId: "over",
            currentOdds: 1.8,
          },
        ],
      },
    };

    expect(isBetBuilderAcceptResponse(responseFixture)).toBe(true);
  });

  test("fixed exotic quote fixture matches contract", () => {
    const quoteFixture = {
      quoteId: "feq:local:001",
      userId: "u-fixed-exotic-1",
      requestId: "fixed-exotic-quote-1",
      exoticType: "exacta",
      combinable: true,
      combinedOdds: 3.51,
      impliedProbability: 0.2849,
      stakeCents: 500,
      potentialPayoutCents: 1755,
      encodedTicket: "exacta:home>over",
      expiresAt: "2026-03-04T10:00:30Z",
      status: "open",
      legs: [
        {
          position: 1,
          marketId: "m:local:001",
          selectionId: "home",
          fixtureId: "f:local:001",
          currentOdds: 1.8,
        },
        {
          position: 2,
          marketId: "m:local:002",
          selectionId: "over",
          fixtureId: "f:local:001",
          currentOdds: 1.95,
        },
      ],
    };

    expect(isFixedExoticQuoteResponse(quoteFixture)).toBe(true);
  });

  test("fixed exotic accept response fixture matches contract", () => {
    const responseFixture = {
      bet: {
        betId: "b:local:000321",
        status: "placed",
      },
      quote: {
        quoteId: "feq:local:000321",
        userId: "u-fixed-exotic-1",
        requestId: "fixed-exotic-quote-1",
        exoticType: "exacta",
        combinable: true,
        status: "accepted",
        acceptedBetId: "b:local:000321",
        legs: [
          {
            position: 1,
            marketId: "m:local:001",
            selectionId: "home",
            fixtureId: "f:local:001",
            currentOdds: 1.8,
          },
          {
            position: 2,
            marketId: "m:local:002",
            selectionId: "over",
            fixtureId: "f:local:001",
            currentOdds: 1.95,
          },
        ],
      },
    };

    expect(isFixedExoticAcceptResponse(responseFixture)).toBe(true);
  });

  test("match tracker timeline fixture matches contract", () => {
    expect(isMatchTrackerTimelineResponse(matchTrackerFixture)).toBe(true);
    if (!isMatchTrackerTimelineResponse(matchTrackerFixture)) {
      return;
    }

    expect(matchTrackerFixture.fixtureId).toBe("f:local:001");
    expect(matchTrackerFixture.incidents.length).toBe(2);
  });

  test("match tracker guard rejects malformed payloads", () => {
    const malformedTimeline = {
      ...matchTrackerFixture,
      score: {
        home: "1",
        away: 0,
      },
    };
    expect(isMatchTrackerTimelineResponse(malformedTimeline)).toBe(false);

    const malformedIncident = {
      ...matchTrackerFixture,
      incidents: [
        ...matchTrackerFixture.incidents.slice(0, 1),
        {
          ...matchTrackerFixture.incidents[1],
          incidentId: 123,
        },
      ],
    };
    expect(isMatchTrackerTimelineResponse(malformedIncident)).toBe(false);
  });

  test("fixture stats fixture matches contract", () => {
    expect(isFixtureStatsResponse(fixtureStatsFixture)).toBe(true);
    if (!isFixtureStatsResponse(fixtureStatsFixture)) {
      return;
    }

    expect(fixtureStatsFixture.fixtureId).toBe("f:local:001");
    expect(fixtureStatsFixture.metrics.shots_on_target.home).toBe(4);
  });

  test("fixture stats guard rejects malformed payloads", () => {
    const malformedMetrics = {
      ...fixtureStatsFixture,
      metrics: {
        ...fixtureStatsFixture.metrics,
        corners: {
          home: "5",
          away: 1,
        },
      },
    };
    expect(isFixtureStatsResponse(malformedMetrics)).toBe(false);

    const malformedClock = {
      ...fixtureStatsFixture,
      clockSeconds: "1320",
    };
    expect(isFixtureStatsResponse(malformedClock)).toBe(false);
  });

  test("freebets fixture matches contract", () => {
    expect(isFreebetListResponse(freebetsPageFixture)).toBe(true);
    if (!isFreebetListResponse(freebetsPageFixture)) {
      return;
    }

    expect(freebetsPageFixture.items[0].freebetId).toBe("fb:local:000001");
    expect(freebetsPageFixture.items[0].remainingAmountCents).toBe(1250);
  });

  test("freebets guard rejects malformed payloads", () => {
    const malformedFreebets = {
      ...freebetsPageFixture,
      items: freebetsPageFixture.items.map((item) => ({
        ...item,
        remainingAmountCents: "1250",
      })),
    };
    expect(isFreebetListResponse(malformedFreebets)).toBe(false);
  });

  test("odds boosts fixture matches contract", () => {
    expect(isOddsBoostListResponse(oddsBoostsPageFixture)).toBe(true);
    if (!isOddsBoostListResponse(oddsBoostsPageFixture)) {
      return;
    }

    expect(oddsBoostsPageFixture.items[0].oddsBoostId).toBe("ob:local:000001");
    expect(oddsBoostsPageFixture.items[0].boostedOdds).toBe(2.1);
  });

  test("odds boosts guard rejects malformed payloads", () => {
    const malformedOddsBoosts = {
      ...oddsBoostsPageFixture,
      items: oddsBoostsPageFixture.items.map((item) => ({
        ...item,
        boostedOdds: "2.1",
      })),
    };
    expect(isOddsBoostListResponse(malformedOddsBoosts)).toBe(false);
  });
});
