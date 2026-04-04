/**
 * API Mock Helpers — Playwright route interceptors for mocking API responses
 */
import { Page, Route } from "@playwright/test";
import { TEST_FIXTURES } from "./test-data";

/**
 * Mock sports list API
 */
export async function mockSportsAPI(page: Page) {
  await page.route("**/api/sports**", (route: Route) => {
    route.abort();
  });
}

/**
 * Mock fixtures/matches list API
 */
export async function mockFixturesAPI(page: Page) {
  await page.route("**/api/fixtures**", (route: Route) => {
    const request = route.request();

    if (request.method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: Object.values(TEST_FIXTURES.fixtures).map((fixture) => ({
            id: fixture.id,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            league: fixture.league,
            startTime: fixture.startTime.toISOString(),
            status: fixture.status,
            score: fixture.score || null,
          })),
          total: 3,
        }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock markets API
 */
export async function mockMarketsAPI(page: Page) {
  await page.route("**/api/markets**", (route: Route) => {
    const request = route.request();

    if (request.method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: Object.values(TEST_FIXTURES.markets),
          total: 3,
        }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock selections/odds API
 */
export async function mockSelectionsAPI(page: Page) {
  await page.route("**/api/selections**", (route: Route) => {
    const request = route.request();

    if (request.method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: Object.values(TEST_FIXTURES.selections),
          total: 5,
        }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock bets API
 */
export async function mockBetsAPI(page: Page) {
  const bets = Object.values(TEST_FIXTURES.bets);

  await page.route("**/api/bets**", (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const status = url.searchParams.get("status");

    if (request.method() === "GET") {
      let filteredBets = bets;
      if (status) {
        filteredBets = bets.filter((bet) => bet.status === status);
      }

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: filteredBets,
          total: filteredBets.length,
        }),
      });
    } else if (request.method() === "POST") {
      // Place bet
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "bet-new-" + Date.now(),
          ...request.postDataJSON(),
          status: "open",
          placedAt: new Date().toISOString(),
        }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock authentication API
 */
export async function mockAuthAPI(page: Page) {
  await page.route("**/api/auth/**", (route: Route) => {
    const request = route.request();

    if (request.url().includes("/login")) {
      if (request.method() === "POST") {
        const postData = request.postDataJSON();

        // Simple mock validation
        const isValid =
          (postData.username === "player@example.com" && postData.password === "test123") ||
          (postData.username === "admin@chucknorris.com" && postData.password === "test");

        if (isValid) {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              token: "mock_token_" + Date.now(),
              user: {
                id: "user-1",
                username: postData.username,
                role: postData.username.includes("admin") ? "admin" : "player",
              },
            }),
          });
        } else {
          route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Invalid credentials",
            }),
          });
        }
      }
    } else if (request.url().includes("/logout")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock user profile API
 */
export async function mockUserProfileAPI(page: Page) {
  await page.route("**/api/user/**", (route: Route) => {
    const request = route.request();

    if (request.method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          username: "player@example.com",
          email: "player@example.com",
          balance: 1000.0,
          role: "player",
          createdAt: new Date().toISOString(),
        }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Setup all common API mocks
 */
export async function setupAllMocks(page: Page) {
  await mockAuthAPI(page);
  await mockUserProfileAPI(page);
  await mockSportsAPI(page);
  await mockFixturesAPI(page);
  await mockMarketsAPI(page);
  await mockSelectionsAPI(page);
  await mockBetsAPI(page);
}

/**
 * Mock a network error for testing error handling
 */
export async function mockNetworkError(page: Page, urlPattern: string) {
  await page.route(urlPattern, (route: Route) => {
    route.abort("failed");
  });
}

/**
 * Mock a slow response for testing loading states
 */
export async function mockSlowResponse(page: Page, urlPattern: string, delayMs = 2000) {
  await page.route(urlPattern, async (route: Route) => {
    await page.waitForTimeout(delayMs);
    route.continue();
  });
}
