import { SecondaryTabs } from "../index";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabsComponent, TabsTypeEnum } from "../tabs";
import React from "react";
import { theme } from "../../../../core-theme";
import { ThemeProvider } from "styled-components";
import { BetslipList } from "../list";
import { BetslipListElement } from "../list/list-element";
import { selectOddsFormat } from "../../../../lib/slices/settingsSlice";
import {
  selectMinStake,
  selectMaxStake,
} from "../../../../lib/slices/siteSettingsSlice";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { selectBets, selectSingleBets } from "../../../../lib/slices/betSlice";
import { BetslipSummary } from "../summary";

jest.mock("../../../../services/api/api-service");

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

mockedUseApiContent.mockReturnValue({
  triggerApi: jest.fn(),
  triggerRefresh: jest.fn(),
  resetHookState: jest.fn(),
  isLoading: false,
  data: [],
  error: undefined,
});

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

const mockedSelectOddsFormat = selectOddsFormat as jest.Mock<any>;
const mockedSelectBets = selectBets as jest.Mock<any>;
const mockedSelectSingleBets = selectSingleBets as jest.Mock<any>;
const mockedSelectMinStake = selectMinStake as jest.Mock<any>;
const mockedSelectMaxStake = selectMaxStake as jest.Mock<any>;

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

    if (arg === mockedSelectSingleBets) {
      return [];
    }

    if (arg === mockedSelectMinStake) {
      return 0.1;
    }

    if (arg === mockedSelectMaxStake) {
      return 10000;
    }

    return false;
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

const betslipListItem = {
  betslipId: "fakeBetSlipElementId1",
  brandMarketId: "brandMarketId1",
  fixtureName: "team1 vs team2",
  marketName: "Match winner - twoway",
  odds: {
    american: "+2000",
    decimal: 10.8,
    fractional: "20/1",
  },
  selectionId: "2",
  selectionName: "away",
  fixtureStatus: "active",
  fixtureId: "fixture-1",
  sportId: "sport-1",
};

const betslipData = [betslipListItem];

describe("Betslip test", () => {
  // BetslipComponent top-level render is omitted — it depends on GeoComply,
  // WebSocket, and heavy Redux state that make isolated rendering fragile.
  // Its sub-components (Tabs, List, ListElement, Summary) are tested below.

  test("tabs: renders tab titles", () => {
    render(
      <ThemeProvider theme={theme}>
        <TabsComponent
          active={0}
          setTabs={jest.fn()}
          type={TabsTypeEnum.SECONDARY}
          elements={[
            { title: "Tab A", content: <div>a</div>, isDisabled: false },
            { title: "Tab B", content: <div>b</div>, isDisabled: false },
            { title: "Tab C", content: <div>c</div>, isDisabled: false },
          ]}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText("Tab A")).toBeTruthy();
    expect(screen.getByText("Tab B")).toBeTruthy();
    expect(screen.getByText("Tab C")).toBeTruthy();
  });

  test("tabs: renders three tab titles based on props", () => {
    render(
      <ThemeProvider theme={theme}>
        <TabsComponent
          setTabs={jest.fn()}
          type={TabsTypeEnum.SECONDARY}
          active={0}
          elements={[
            { title: "1", content: <div>a</div>, isDisabled: false },
            { title: "2", content: <div>b</div>, isDisabled: false },
            { title: "3", content: <div>c</div>, isDisabled: false },
          ]}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  test("tabs: renders content items from the first tab", () => {
    render(
      <ThemeProvider theme={theme}>
        <TabsComponent
          active={2}
          setTabs={jest.fn()}
          type={TabsTypeEnum.SECONDARY}
          elements={[
            {
              title: "1",
              content: [
                <li key="a">a</li>,
                <li key="b">b</li>,
                <li key="c">c</li>,
                <li key="d">d</li>,
              ],
              isDisabled: false,
            },
            {
              title: "2",
              isDisabled: false,
              content: <div>content-b</div>,
            },
            {
              title: "3",
              isDisabled: false,
              content: <div>content-c</div>,
            },
          ]}
        />
      </ThemeProvider>,
    );

    // All tab panels are rendered (content is in the DOM, visibility is CSS-controlled)
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
    expect(screen.getByText("c")).toBeTruthy();
    expect(screen.getByText("d")).toBeTruthy();
    expect(screen.getByText("content-b")).toBeTruthy();
    expect(screen.getByText("content-c")).toBeTruthy();
  });

  test("betslip list: should show empty message container when betslip data is empty", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipList
          betslipData={[]}
          noInteract={false}
          infiniteScroll={false}
          selectedTab={SecondaryTabs.SINGLE}
        />
      </ThemeProvider>,
    );
    const emptyMessageContainer = screen.getByRole("emptyBetslipMessage");
    expect(emptyMessageContainer).toBeTruthy();
  });

  test("betslip list: should show list if data is not empty", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipList
          betslipData={betslipData}
          noInteract={false}
          infiniteScroll={false}
          selectedTab={SecondaryTabs.SINGLE}
        />
      </ThemeProvider>,
    );
    const betslipList = screen.getByRole("betslipList");
    expect(betslipList).toBeTruthy();
  });

  test("betslip list element: should show proper selection name", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipListElement
          item={betslipListItem}
          isErrorVisible={false}
          noInteract={false}
          removeElement={jest.fn}
          setValueForCurrentBet={jest.fn}
          fixtureStatus={"active"}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn}
        />
      </ThemeProvider>,
    );
    const selectionName = screen.getByRole("selectionName");
    expect(selectionName.textContent).toContain("away");
  });

  test("betslip list element: should show proper odds", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipListElement
          item={betslipListItem}
          isErrorVisible={false}
          noInteract={false}
          removeElement={jest.fn}
          setValueForCurrentBet={jest.fn}
          fixtureStatus={"active"}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn}
        />
      </ThemeProvider>,
    );
    const odds = screen.getByRole("odds");
    expect(odds.textContent).toBe("10.8");
  });

  test("betslip list element: should show proper market name", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipListElement
          item={betslipListItem}
          isErrorVisible={false}
          noInteract={false}
          removeElement={jest.fn}
          setValueForCurrentBet={jest.fn}
          fixtureStatus={"active"}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn}
        />
      </ThemeProvider>,
    );
    const marketName = screen.getByRole("marketName");
    expect(marketName.textContent).toBe("Match winner - twoway");
  });

  test("betslip list element: should show proper fixture name", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipListElement
          item={betslipListItem}
          isErrorVisible={false}
          noInteract={false}
          removeElement={jest.fn}
          setValueForCurrentBet={jest.fn}
          fixtureStatus={"active"}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn}
        />
      </ThemeProvider>,
    );
    const fixtureName = screen.getByRole("fixtureName");
    expect(fixtureName.textContent).toBe("team1 vs team2");
  });

  test("betslip list element: should show proper initial to return value (0)", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipListElement
          item={betslipListItem}
          isErrorVisible={false}
          noInteract={false}
          removeElement={jest.fn}
          setValueForCurrentBet={jest.fn}
          fixtureStatus={"active"}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn}
        />
      </ThemeProvider>,
    );
    const toReturnValue = screen.getByRole("toReturnValue");
    expect(toReturnValue.textContent).toBe("$0.00");
  });

  test("betslip list element: should show proper calculated to return value", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipListElement
          item={betslipListItem}
          isErrorVisible={false}
          noInteract={false}
          removeElement={jest.fn}
          setValueForCurrentBet={jest.fn}
          fixtureStatus={"active"}
          betValues={{
            fakeBetSlipElementId1: {
              bet: 3,
              toReturn: 4.35,
            },
          }}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn}
        />
      </ThemeProvider>,
    );
    const toReturnValue = screen.getByRole("toReturnValue");
    expect(toReturnValue.textContent).toBe("$4.35");
  });

  test("betslip summary: renders with stake amount", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipSummary
          summaryValues={{
            totalStake: 1,
            possibleReturn: 1,
            betValues: {
              a: {
                bet: 1,
                toReturn: 1,
              },
            },
            totalOdds: 1,
            multiBetsPossibleReturn: 0,
          }}
          setReadyForSendSingleBets={jest.fn}
          setReadyForSendMultiBets={jest.fn}
          selectedTab={SecondaryTabs.SINGLE}
          acceptBetterOddsValue={true}
          setAcceptBetterOddsValue={jest.fn}
          resetBetslipItemsStatus={jest.fn}
        />
      </ThemeProvider>,
    );
    const totalStake = screen.getByRole("stake-amount");
    expect(totalStake).toBeTruthy();
    expect(totalStake.textContent).toBe("1");
  });

  test("betslip summary: should display proper possible return", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetslipSummary
          summaryValues={{
            totalStake: 1,
            possibleReturn: 1,
            betValues: {
              a: {
                bet: 1,
                toReturn: 1,
              },
            },
            totalOdds: 1,
            multiBetsPossibleReturn: 0,
          }}
          setReadyForSendSingleBets={jest.fn}
          setReadyForSendMultiBets={jest.fn}
          selectedTab={SecondaryTabs.SINGLE}
          acceptBetterOddsValue={true}
          setAcceptBetterOddsValue={jest.fn}
          resetBetslipItemsStatus={jest.fn}
        />
      </ThemeProvider>,
    );
    const possibleReturn = screen.getByRole("possible-return");

    expect(possibleReturn.textContent).toBe("$1");
  });

  test("betslip summary: should trigger promo actions", () => {
    const toggleFreebet = jest.fn();
    const toggleOddsBoost = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <BetslipSummary
          summaryValues={{
            totalStake: 1,
            possibleReturn: 1,
            betValues: {
              a: {
                bet: 1,
                toReturn: 1,
              },
            },
            totalOdds: 1,
            multiBetsPossibleReturn: 0,
          }}
          setReadyForSendSingleBets={jest.fn}
          setReadyForSendMultiBets={jest.fn}
          selectedTab={SecondaryTabs.SINGLE}
          acceptBetterOddsValue={true}
          setAcceptBetterOddsValue={jest.fn}
          resetBetslipItemsStatus={jest.fn}
          availableFreebetsCount={2}
          availableOddsBoostCount={1}
          toggleFreebet={toggleFreebet}
          toggleOddsBoost={toggleOddsBoost}
        />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText(/APPLY_FREEBET|Apply Freebet/i));
    fireEvent.click(screen.getByText(/APPLY_ODDS_BOOST|Apply Odds Boost/i));

    expect(toggleFreebet).toHaveBeenCalledTimes(1);
    expect(toggleOddsBoost).toHaveBeenCalledTimes(1);
  });
});
