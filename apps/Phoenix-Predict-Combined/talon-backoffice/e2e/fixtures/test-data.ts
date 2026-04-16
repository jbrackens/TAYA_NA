/**
 * Test Data — Fixtures for consistent test data across E2E suites
 */

export const TEST_FIXTURES = {
  // Admin credentials (for backoffice)
  admin: {
    username: "admin@chucknorris.com",
    password: "test",
  },

  // Player credentials (for player app)
  player: {
    username: "player@example.com",
    password: "test123",
  },

  // Sample sports
  sports: {
    football: {
      name: "Football",
      slug: "football",
    },
    basketball: {
      name: "Basketball",
      slug: "basketball",
    },
    tennis: {
      name: "Tennis",
      slug: "tennis",
    },
  },

  // Sample leagues
  leagues: {
    premierLeague: {
      id: "league-1",
      name: "Premier League",
      sport: "football",
    },
    laLiga: {
      id: "league-2",
      name: "La Liga",
      sport: "football",
    },
    nba: {
      id: "league-3",
      name: "NBA",
      sport: "basketball",
    },
  },

  // Sample fixtures/matches
  fixtures: {
    match1: {
      id: "fixture-1",
      homeTeam: "Manchester United",
      awayTeam: "Liverpool",
      league: "Premier League",
      startTime: new Date(Date.now() + 86400000), // Tomorrow
      status: "scheduled",
    },
    match2: {
      id: "fixture-2",
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
      league: "La Liga",
      startTime: new Date(Date.now() + 86400000),
      status: "scheduled",
    },
    liveMatch: {
      id: "fixture-3",
      homeTeam: "Lakers",
      awayTeam: "Celtics",
      league: "NBA",
      startTime: new Date(Date.now() - 1800000), // Started 30 mins ago
      status: "live",
      score: { home: 45, away: 42 },
    },
  },

  // Sample markets
  markets: {
    matchWinner: {
      id: "market-1",
      name: "Match Winner",
      type: "moneyline",
      status: "active",
    },
    overUnder: {
      id: "market-2",
      name: "Over/Under 2.5 Goals",
      type: "totals",
      status: "active",
    },
    asianHandicap: {
      id: "market-3",
      name: "Asian Handicap",
      type: "handicap",
      status: "active",
    },
  },

  // Sample selections with odds
  selections: {
    homeWin: {
      id: "sel-1",
      market: "Match Winner",
      outcome: "Home Win",
      odds: 2.15,
    },
    awayWin: {
      id: "sel-2",
      market: "Match Winner",
      outcome: "Away Win",
      odds: 1.95,
    },
    draw: {
      id: "sel-3",
      market: "Match Winner",
      outcome: "Draw",
      odds: 3.5,
    },
    over25: {
      id: "sel-4",
      market: "Over/Under 2.5 Goals",
      outcome: "Over 2.5",
      odds: 1.85,
    },
    under25: {
      id: "sel-5",
      market: "Over/Under 2.5 Goals",
      outcome: "Under 2.5",
      odds: 2.05,
    },
  },

  // Sample bets
  bets: {
    openBet: {
      id: "bet-1",
      selections: 1,
      stake: 100,
      potentialReturn: 215,
      status: "open",
      placedAt: new Date(Date.now() - 3600000),
    },
    wonBet: {
      id: "bet-2",
      selections: 1,
      stake: 50,
      potentialReturn: 107.5,
      settledAt: new Date(Date.now() - 86400000),
      status: "won",
      returns: 107.5,
    },
    lostBet: {
      id: "bet-3",
      selections: 1,
      stake: 25,
      potentialReturn: 51.25,
      settledAt: new Date(Date.now() - 172800000),
      status: "lost",
      returns: 0,
    },
  },

  // Quick stake amounts
  quickStakes: [5, 10, 25, 50, 100],

  // Test timeouts
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 30000,
  },
};

/**
 * Page object base class for DRY test code
 */
export class BasePage {
  constructor(protected page: any) {}

  async goto(path: string) {
    return this.page.goto(path);
  }

  async waitForLoadComplete(timeout = 30000) {
    await this.page.waitForLoadState("networkidle", { timeout });
  }

  async getTitle() {
    return this.page.title();
  }

  async screenshot(name: string) {
    return this.page.screenshot({ path: `./screenshots/${name}.png` });
  }

  async waitForSelector(selector: string, timeout = 10000) {
    return this.page.waitForSelector(selector, { timeout });
  }

  async clickAndWaitForNavigation(selector: string) {
    return Promise.all([
      this.page.waitForNavigation(),
      this.page.click(selector),
    ]);
  }
}
