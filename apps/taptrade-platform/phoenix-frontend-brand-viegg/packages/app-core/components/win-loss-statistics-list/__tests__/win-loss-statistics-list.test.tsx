import { WinLossStatisticsList } from "../index";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../core-theme";
import {
  BetDetail,
  BetOutcomeEnum,
  BetStatusEnum,
  BetTypeEnum,
} from "@phoenix-ui/utils";
import { selectOddsFormat } from "../../../lib/slices/settingsSlice";

const mockSelectOddsFormat = selectOddsFormat;

jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation((selector) => {
    if (selector === mockSelectOddsFormat) {
      return "decimal";
    }
    return "Europe/London";
  }),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
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

jest.mock("../../avatar", () => ({
  AvatarComponent: () =>
    require("react").createElement("div", { "data-testid": "avatar" }),
}));

jest.mock("antd", () => {
  const React = require("react");
  const passthrough = (tag = "div") => ({ children, ...props }: any) =>
    React.createElement(tag, props, children);
  const List: any = ({ dataSource = [], renderItem }: any) =>
    React.createElement(
      "div",
      {},
      dataSource.map((item: any, index: number) =>
        React.createElement("div", { key: index }, renderItem(item)),
      ),
    );
  List.Item = ({ children, extra }: any) =>
    React.createElement(
      "div",
      {},
      React.createElement("div", {}, children),
      React.createElement("div", {}, extra),
    );
  List.Item.Meta = ({ title }: any) => React.createElement("div", {}, title);

  return {
    Avatar: passthrough(),
    Row: passthrough(),
    Col: passthrough(),
    Divider: passthrough("hr"),
    Spin: passthrough(),
    Tag: passthrough(),
    Button: passthrough("button"),
    Modal: passthrough(),
    List,
    Typography: { Title: passthrough("h1") },
    Collapse: Object.assign(passthrough(), { Panel: passthrough() }),
  };
});

const singleLegStatistics: Array<BetDetail> = [
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
          id: "tournamentId1",
          name: "tournamentName1",
        },
        fixture: {
          id: "fixtureId1",
          name: "fixtureName1",
          startTime: "2021-02-23T14:00:00Z",
          status: BetStatusEnum.SETTLED,
        },
        id: "legId1",
        market: {
          id: "marketId1",
          name: "marketName1",
        },
        odds: 8.47,
        displayOdds: {
          american: "+747",
          decimal: 8.47,
          fractional: "747/100",
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
        },
        status: BetStatusEnum.SETTLED,
      },
    ],
    odds: 8.47,
    displayOdds: {
      american: "+747",
      decimal: 8.47,
      fractional: "747/100",
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
  },
];

const multiLegStatistics: Array<BetDetail> = [
  {
    ...singleLegStatistics[0],
    betType: BetTypeEnum.MULTI,
    legs: [
      ...singleLegStatistics[0].legs,
      {
        ...singleLegStatistics[0].legs[0],
        id: "legId2",
        fixture: {
          id: "fixtureId2",
          name: "fixtureName2",
          startTime: "2021-02-24T14:00:00Z",
          status: BetStatusEnum.SETTLED,
        },
        market: {
          id: "marketId2",
          name: "marketName2",
        },
        selection: {
          id: "3",
          name: "home",
        },
      },
    ],
  },
];

describe("win loss statistics list", () => {
  test("renders single-leg details", () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={singleLegStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole("betType").textContent).toBe(BetTypeEnum.SINGLE);
    expect(screen.getByRole("odds").textContent).toBe("8.47");
    expect(screen.getByRole("stake").textContent).toBe("$5.00LOST");
    expect(screen.getByRole("pL").textContent).toBe("$0.00");
    expect(screen.getByRole("betId").textContent).toBe("betId");
  });

  test("renders collapse control for multi-leg bets", () => {
    render(
      <ThemeProvider theme={theme}>
        <WinLossStatisticsList
          winLossStatistics={multiLegStatistics}
          isLoading={false}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole("collapseButton").textContent).toBeTruthy();
  });
});
