import { FixtureListComponent } from "..";
import { render, screen } from "@testing-library/react";
import { useApi } from "../../../../services/api/api-service";
import { UseApiHook } from "@phoenix-ui/utils";
import { ThemeProvider } from "styled-components";
import { theme } from "./../../../../core-theme";
import { selectBets } from "../../../../lib/slices/betSlice";
import { selectOddsFormat } from "../../../../lib/slices/settingsSlice";

jest.mock("../../../../services/api/api-service");

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

const mockedUseApiContent = useApi as jest.Mock<UseApiHook>;

beforeEach(() => {
  jest.clearAllMocks();
});

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

mockedUseApiContent.mockReturnValue({
  triggerApi: jest.fn(),
  isLoading: false,
  data: { data: markets },
  error: false,
  statusOk: true,
  triggerRefresh: jest.fn(),
  resetHookState: jest.fn(),
});

describe("fixture list test", () => {
  test("fixture: display proper torunament name", async () => {
    render(
      <ThemeProvider theme={theme}>
        <FixtureListComponent />
      </ThemeProvider>,
    );
    const tournamentName = screen.getByRole("tournamentName");
    expect(tournamentName.textContent).toBe("Spring Sweet Spring #2");
  });

  test("fixture: display proper home competitor name", async () => {
    render(
      <ThemeProvider theme={theme}>
        <FixtureListComponent />
      </ThemeProvider>,
    );
    const homeCompetitor = screen.getByRole("homeCompetitor");
    expect(homeCompetitor.textContent).toBe("Wisła Kraków");
  });

  test("fixture: display proper away competitor name", async () => {
    render(
      <ThemeProvider theme={theme}>
        <FixtureListComponent />
      </ThemeProvider>,
    );
    const awayCompetitor = screen.getByRole("awayCompetitor");
    expect(awayCompetitor.textContent).toBe("Dignitas");
  });

  test("fixture: display proper home competitor score", async () => {
    render(
      <ThemeProvider theme={theme}>
        <FixtureListComponent />
      </ThemeProvider>,
    );
    const homeCompetitorScore = screen.getByRole("homeCompetitorScore");
    expect(homeCompetitorScore.textContent).toBe("0");
  });

  test("fixture: display proper away competitor score", async () => {
    render(
      <ThemeProvider theme={theme}>
        <FixtureListComponent />
      </ThemeProvider>,
    );
    const awayCompetitorScore = screen.getByRole("awayCompetitorScore");
    expect(awayCompetitorScore.textContent).toBe("0");
  });
});
