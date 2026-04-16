import { WinLossStatisticsList } from "../index";
import { render, screen } from "@testing-library/react";
import { useApi, UseApi } from "../../../services/api/api-service";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../core-theme";
import {
  BetDetail,
  BetTypeEnum,
  BetStatusEnum,
  BetOutcomeEnum,
} from "@phoenix-ui/utils";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import { selectOddsFormat } from "../../../lib/slices/settingsSlice";
dayjs.extend(LocalizedFormat);

jest.mock("../../../services/api/api-service");

const mockedSelectOddsFormat = selectOddsFormat as jest.Mock<any>;

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation((arg) => {
    if (arg === mockedSelectOddsFormat) {
      return "decimal";
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

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

mockedUseApiContent.mockReturnValue({
  triggerApi: jest.fn(),
  isLoading: false,
  data: null,
  error: false,
} as any);

beforeEach(() => {
  jest.clearAllMocks();
});

const winLossStatistics: Array<BetDetail> = [
  {
    betId: "betId",
    betType: BetTypeEnum.SINGLE,
    legs: [
      {
        competitor: {
          id: "competitorId1",
          name: "competitorName1",
        },
        tournament: {
          id: '1',
          name: "competitorName1",
        },
        fixture: {
          id: "fixtureId1",
          name: "fixtureName1",
          startTime: "2021-02-23T14:00:00Z",
        },
        id: "legId1",
        market: {
          id: "marketId1",
          name: "marketName1",
          status: 'open',
        },
        displayOdds: {
          american: "+2000",
          decimal: 8.47,
          fractional: "20/1",
        },
        outcome: BetOutcomeEnum.LOST,
        selection: {
          id: "2",
          name: "away",
        },
        placedAt: "2021-02-23T15:47:39.691Z",
        sport: {
          id: "s3",
          name: "Counter-Strike: Global Offensive",
          status: 'open',
        },
        status: BetStatusEnum.SETTLED,
      },
    ],
    displayOdds: {
      american: "+2000",
      decimal: 8.47,
      fractional: "20/1",
    },
    outcome: BetOutcomeEnum.LOST,
    profitLoss: 0,
    placedAt: "2021-02-23T15:47:39.691Z",
    sports: [
      {
        id: "s3",
        name: "Counter-Strike: Global Offensive",
      },
    ],
    stake: {
      amount: 5,
      currency: "USD",
    },
    transactionId: "id_not_yet_available",
  },
] as any;

const winLossStatisticsWithMultipleLegs: Array<BetDetail> = [
  {
    betId: "betId",
    betType: BetTypeEnum.MULTI,
    legs: [
      {
        competitor: {
          id: "competitorId1",
          name: "competitorName1",
        },
        tournament: {
          id: '1',
          name: "competitorName1",
        },
        fixture: {
          id: "fixtureId1",
          name: "fixtureName1",
          startTime: "2021-02-23T14:00:00Z",
        },
        id: "legId1",
        market: {
          id: "marketId1",
          name: "marketName1",
          status: 'open',
        },
        displayOdds: {
          american: "+2000",
          decimal: 8.47,
          fractional: "20/1",
        },
        outcome: BetOutcomeEnum.LOST,
        selection: {
          id: "2",
          name: "away",
        },
        placedAt: "2021-02-23T15:47:39.691Z",
        sport: {
          id: "s3",
          name: "Counter-Strike: Global Offensive",
          status: 'open',
        },
        status: BetStatusEnum.SETTLED,
      },
      {
        competitor: {
          id: "competitorId2",
          name: "competitorName2",
        },
        tournament: {
          name: "competitorName2",
        },
        fixture: {
          id: "fixtureId2",
          name: "fixtureName2",
          startTime: "2021-02-23T14:00:00Z",
        },
        id: "legId2",
        market: {
          id: "marketId2",
          name: "marketName2",
        },
        displayOdds: {
          american: "+2000",
          decimal: 8.47,
          fractional: "20/1",
        },
        outcome: BetOutcomeEnum.LOST,
        selection: {
          id: "2",
          name: "away",
        },
        placedAt: "2021-02-23T15:47:39.691Z",
        sport: {
          id: "s3",
          name: "Counter-Strike: Global Offensive",
          status: 'open',
        },
        status: BetStatusEnum.SETTLED,
      },
    ],
    displayOdds: {
      american: "+2000",
      decimal: 8.47,
      fractional: "20/1",
    },
    outcome: BetOutcomeEnum.LOST,
    profitLoss: 0,
    placedAt: "2021-02-23T15:47:39.691Z",
    sports: [
      {
        id: "s3",
        name: "Counter-Strike: Global Offensive",
      },
    ],
    stake: {
      amount: 5,
      currency: "USD",
    },
    transactionId: "id_not_yet_available",
  },
] as any;

describe("win loss statistics test", () => {
  test("displaying data: should show proper bet type", async () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );
    const betType = screen.getByRole("betType");
    expect(betType.textContent).toBe(BetTypeEnum.SINGLE);
  });

  // test("displaying data: should show proper placed date time", async () => {
  //   render(
  //     <ThemeProvider theme={theme}>
  //       <WinLossStatisticsList
  //         winLossStatistics={winLossStatistics}
  //         isLoading={false}
  //       />
  //     </ThemeProvider>,
  //   );
  //   const placedDateTime = screen.getByRole("placedDateTime");
  //   expect(placedDateTime.textContent).toBe("Feb 23, 2021 4:47 PM");
  // });

  test("displaying data: should show proper odds", async () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );
    const odds = screen.getByRole("odds");
    expect(odds.textContent).toBe("8.47");
  });

  test("displaying data: should show proper stake", async () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );
    const stake = screen.getByRole("stake");
    expect(stake.textContent).toBe("$5.00LOST");
  });

  test("displaying data: should show proper p&l", async () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );
    const pL = screen.getByRole("pL");
    expect(pL.textContent).toBe("$0.00");
  });

  test("displaying data: should show proper financial bet id", async () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );
    const betId = screen.getByRole("betId");

    expect(betId.textContent).toBe("betId");
  });

  test("displaying data: should display collapse button if api is returning multiple legs", async () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatisticsWithMultipleLegs}
          isLoading={false}
        />
      </ThemeProvider>,
    );
    const collapseButton = screen.getByRole("collapseButton");

    expect(collapseButton.textContent).toBeTruthy();
  });

  test("displaying data: should NOT display collapse button if api is returning single leg", async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );

    expect(container.querySelector("#collapseButton")).toBeNull();
  });

  test("displaying data: should show proper leg market name", async () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );
    const marketName = screen.getByRole("marketName");

    expect(marketName.textContent).toBe("marketName1");
  });

  test("displaying data: should show proper leg odds", async () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={winLossStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );
    const legOdds = screen.getByRole("legOdds");

    expect(legOdds.textContent).toBe((8.47).toFixed(2));
  });

  // test("displaying data: should show proper leg settledBet", async () => {
  //   render(
  //     <ThemeProvider theme={theme}>
  //       <WinLossStatisticsList
  //         winLossStatistics={winLossStatistics}
  //         isLoading={false}
  //       />
  //     </ThemeProvider>,
  //   );
  //   const settledBet = screen.getByRole("settledBet");

  //   expect(settledBet.textContent).toBe("Feb 23, 2021 4:47 PM");
  // });
});
