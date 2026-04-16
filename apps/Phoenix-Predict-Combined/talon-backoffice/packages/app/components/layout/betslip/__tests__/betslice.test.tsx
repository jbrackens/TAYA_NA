// @ts-nocheck
import { BetslipComponent, SecondaryTabs } from "../index";
import { render, screen } from "@testing-library/react";
import { TabsComponent, TabsTypeEnum } from "../tabs";
import Enzyme, { shallow } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import React from "react";
import { theme } from "../../../../core-theme";
import { ThemeProvider } from "styled-components";
import { BetslipList } from "../list";
import { BetslipListElement } from "../list/list-element";
import { selectOddsFormat } from "../../../../lib/slices/settingsSlice";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { selectBets, selectSingleBets } from "../../../../lib/slices/betSlice";
import { BetslipSummary } from "../summary";

Enzyme.configure({ adapter: new Adapter() });

jest.mock("../../../../services/api/api-service");

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

mockedUseApiContent.mockReturnValue({
  triggerApi: jest.fn(),
  triggerRefresh: jest.fn(),
  isLoading: false,
  data: [],
  error: undefined,
} as any);

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

const mockedSelectOddsFormat = selectOddsFormat as jest.Mock<any>;
const mockedSelectBets = selectBets as jest.Mock<any>;
const mockedSelectSingleBets = selectSingleBets as jest.Mock<any>;

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

    return false;
  }),
}));

//declared becuase of TypeError: window.matchMedia is no betslip list element: should show proper selection namet a function
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
};

const betslipData = [betslipListItem];

describe("Betslip test", () => {
  test("betslip: check if exists ", async () => {
    const tabs = shallow(<BetslipComponent setHeaderBetsCount={jest.fn as any} />);
    expect(tabs.exists()).toBeTruthy();
  });

  test("tabs: check if exists ", async () => {
    const tabs = shallow(
      <TabsComponent
        active={0}
        setTabs={jest.fn()}
        type={TabsTypeEnum.SECONDARY}
        elements={[
          {
            title: "1",
            content: <div>a</div>,
            isDisabled: false,
          },
          {
            title: "2",
            content: <div>b</div>,
            isDisabled: false,
          },
          {
            title: "3",
            content: <div>c</div>,
            isDisabled: false,
          },
        ]}
      />,
    );
    expect(tabs.exists()).toBeTruthy();
  });

  test("tabs: render properly based on props", () => {
    const tabs = shallow(
      <TabsComponent
        setTabs={jest.fn()}
        type={TabsTypeEnum.SECONDARY}
        active={0}
        elements={[
          {
            title: "1",
            content: <div>a</div>,
            isDisabled: false,
          },
          {
            title: "2",
            content: <div>b</div>,
            isDisabled: false,
          },
          {
            title: "3",
            content: <div>c</div>,
            isDisabled: false,
          },
        ]}
      />,
    );

    expect(tabs.find("indexstyled__TabTitle")).toHaveLength(3);
  });

  test("tabs: render proper content for inital tab", () => {
    const tabs = shallow(
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
            content: <div>b</div>,
          },
          {
            title: "3",
            isDisabled: false,
            content: <div>c</div>,
          },
        ]}
      />,
    );

    expect(tabs.find("li")).toHaveLength(4);
  });

  // test("tabs: render proper second tab as initial", () => {
  //   const tabs = mount(
  //     <ThemeProvider theme={theme}>
  //       <TabsComponent
  //         active={1}
  //         setTabs={jest.fn()}
  //         type={TabsTypeEnum.SECONDARY}
  //         elements={[
  //           {
  //             title: "1",
  //             isDisabled: false,
  //             content: [<li>a</li>, <li>b</li>, <li>c</li>, <li>d</li>],
  //           },
  //           {
  //             isDisabled: false,
  //             title: "2",
  //             content: [<li>b</li>, <li>c</li>],
  //           },
  //           {
  //             title: "3",
  //             isDisabled: false,
  //             content: <div>c</div>,
  //           },
  //         ]}
  //       />
  //     </ThemeProvider>,
  //   );

  //   expect(tabs.find("li").get(1).props.selected).toBe(true);
  // });

  // test("tabs: render second tab disabled", () => {
  //   const tabs = mount(
  //     <ThemeProvider theme={theme}>
  //       <TabsComponent
  //         active={2}
  //         setTabs={jest.fn()}
  //         type={TabsTypeEnum.SECONDARY}
  //         elements={[
  //           {
  //             title: "1",
  //             isDisabled: true,
  //             content: [<li>a</li>, <li>b</li>, <li>c</li>, <li>d</li>],
  //           },
  //           {
  //             isDisabled: false,
  //             title: "2",
  //             content: [<li>b</li>, <li>c</li>],
  //           },
  //           {
  //             title: "3",
  //             isDisabled: false,
  //             content: <div>c</div>,
  //           },
  //         ]}
  //       />
  //     </ThemeProvider>,
  //   );

  //   expect(tabs.find("li").get(0).props.disabled).toBe(true);
  // });

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
          isErrorVisible={false}
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
          removeElement={jest.fn as any}
          isChecked={false}
          handleElementCheck={jest.fn as any}
          setValueForCurrentBet={jest.fn as any}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn as any}
        /> as any
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
          removeElement={jest.fn as any}
          isChecked={false}
          handleElementCheck={jest.fn as any}
          setValueForCurrentBet={jest.fn as any}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn as any}
        /> as any
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
          removeElement={jest.fn as any}
          isChecked={false}
          handleElementCheck={jest.fn as any}
          setValueForCurrentBet={jest.fn as any}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn as any}
        /> as any
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
          removeElement={jest.fn as any}
          isChecked={false}
          handleElementCheck={jest.fn as any}
          setValueForCurrentBet={jest.fn as any}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn as any}
        /> as any
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
          removeElement={jest.fn as any}
          isChecked={false}
          handleElementCheck={jest.fn as any}
          setValueForCurrentBet={jest.fn as any}
          betValues={{}}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn as any}
        /> as any
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
          removeElement={jest.fn as any}
          isChecked={false}
          handleElementCheck={jest.fn as any}
          setValueForCurrentBet={jest.fn as any}
          betValues={{
            fakeBetSlipElementId1: {
              bet: 3,
              toReturn: 4.35,
            },
          }}
          selectedTab={SecondaryTabs.SINGLE}
          setItemsWithError={jest.fn as any}
        /> as any
      </ThemeProvider>,
    );
    const toReturnValue = screen.getByRole("toReturnValue");
    expect(toReturnValue.textContent).toBe("$4.35");
  });

  test("betslip summary: should exists", () => {
    const summary = shallow(
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
        setIsConfirmationComponentVisible={jest.fn}
        setReadyForSendSingleBets={jest.fn}
        setReadyForSendMultiBets={jest.fn}
        selectedTab={SecondaryTabs.SINGLE}
        acceptBetterOddsValue={true}
        setAcceptBetterOddsValue={jest.fn}
        resetBetslipItemsStatus={jest.fn}
      />,
    );

    expect(summary).toBeTruthy();
  });

  test("betslip summary: should display proper stake amount", () => {
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
          setIsConfirmationComponentVisible={jest.fn as any}
          setReadyForSendSingleBets={jest.fn as any}
          setReadyForSendMultiBets={jest.fn as any}
          selectedTab={SecondaryTabs.SINGLE}
          acceptBetterOddsValue={true}
          setAcceptBetterOddsValue={jest.fn as any}
          resetBetslipItemsStatus={jest.fn as any}
        />
      </ThemeProvider>,
    );
    const totalStake = screen.getByRole("stake-amount");

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
          setIsConfirmationComponentVisible={jest.fn as any}
          setReadyForSendSingleBets={jest.fn as any}
          setReadyForSendMultiBets={jest.fn as any}
          selectedTab={SecondaryTabs.SINGLE}
          acceptBetterOddsValue={true}
          setAcceptBetterOddsValue={jest.fn as any}
          resetBetslipItemsStatus={jest.fn as any}
        />
      </ThemeProvider>,
    );
    const possibleReturn = screen.getByRole("possible-return");

    expect(possibleReturn.textContent).toBe("$1");
  });
});
