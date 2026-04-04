import { FixtureListComponent } from "..";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "styled-components";
import { theme } from "./../../../../core-theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import { selectBets } from "../../../../lib/slices/betSlice";
import { selectOddsFormat } from "../../../../lib/slices/settingsSlice";

jest.mock("../../../../services/go-api/events/events-hooks", () => ({
  useEvents: jest.fn(),
}));

jest.mock("../../../../services/go-api/events/events-transforms", () => ({
  transformGoEventsResponse: jest.fn(),
  mapFixtureStatusToGoStatus: jest.fn(),
}));

const mockedSelectBets = selectBets as jest.Mock<any>;
const mockedSelectOddsFormat = selectOddsFormat as jest.Mock<any>;

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn().mockImplementation(() => {
    return () => {};
  }),
  useSelector: jest.fn().mockImplementation((arg) => {
    if (arg === mockedSelectOddsFormat) {
      return "decimal";
    }
    if (arg === mockedSelectBets) {
      return [];
    }
    return "Europe/London";
  }),
}));

//declared becuase of TypeError: window.matchMedia is not a function
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("next/router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    query: {},
    pathname: "/",
  })),
}));

const markets = [
  {
    competitors: {
      away: {
        abbreviation: "Dignitas",
        competitorId: "c624",
        name: "Dignitas",
        qualifier: "away",
        score: 0,
      },
      home: {
        abbreviation: "WK",
        competitorId: "c486",
        name: "Wisła Kraków",
        qualifier: "home",
        score: 0,
      },
    },
    fixtureId: "f31068",
    fixtureName: "Wisła Kraków vs Dignitas",
    isLive: true,
    markets: [
      {
        marketId: "6ca66cdf-9543-4cb6-9e8f-be9e2911bfad",
        marketName: "Match winner - twoway",
        marketStatus: {
          changeReason: {
            status: "LIVE",
            type: "DATA_SUPPLIER_CHANGE",
          },
          type: "BETTABLE",
        },
        marketType: "MATCH_WINNER",
        selectionOdds: [
          {
            active: true,
            displayOdds: {
              american: "+2000",
              decimal: 1.32,
              fractional: "20/1",
            },
            selectionId: "2",
            selectionName: "away",
          },
          {
            active: true,
            displayOdds: {
              american: "+2000",
              decimal: 3.02,
              fractional: "20/1",
            },
            selectionId: "1",
            selectionName: "home",
          },
        ],
        specifiers: {
          variant: "way:two",
          way: "two",
        },
      },
    ],
    marketsTotalCount: 111,
    sport: {
      abbreviation: "CS:GO",
      displayToPunters: true,
      name: "Counter-Strike: Global Offensive",
      sportId: "s3",
    },
    startTime: "2021-05-24T10:15:00Z",
    status: "LIVE",
    tournament: {
      name: "Spring Sweet Spring #2",
      sportId: "s3",
      startTime: "2021-05-09T22:00:00Z",
      tournamentId: "t1345",
    },
  },
];

const { useEvents } = require("../../../../services/go-api/events/events-hooks");
const { transformGoEventsResponse } = require("../../../../services/go-api/events/events-transforms");

beforeEach(() => {
  jest.clearAllMocks();

  (useEvents as jest.Mock).mockReturnValue({
    data: { events: [] },
    isLoading: false,
  });

  (transformGoEventsResponse as jest.Mock).mockReturnValue({
    data: markets,
    totalCount: 1,
    currentPage: 1,
    itemsPerPage: 20,
    hasNextPage: false,
  });
});

describe("fixture list test", () => {
  test("fixture: display proper torunament name", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <FixtureListComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const tournamentName = screen.getByRole("tournamentName");
    expect(tournamentName.textContent).toBe("Spring Sweet Spring #2");
  });

  test("fixture: display proper home competitor name", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <FixtureListComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const homeCompetitor = screen.getByRole("homeCompetitor");
    expect(homeCompetitor.textContent).toBe("Wisła Kraków");
  });

  test("fixture: display proper away competitor name", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <FixtureListComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const awayCompetitor = screen.getByRole("awayCompetitor");
    expect(awayCompetitor.textContent).toBe("Dignitas");
  });

  test("fixture: display proper home competitor score", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <FixtureListComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const homeCompetitorScore = screen.getByRole("homeCompetitorScore");
    expect(homeCompetitorScore.textContent).toBe("0");
  });

  test("fixture: display proper away competitor score", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <FixtureListComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const awayCompetitorScore = screen.getByRole("awayCompetitorScore");
    expect(awayCompetitorScore.textContent).toBe("0");
  });
});
