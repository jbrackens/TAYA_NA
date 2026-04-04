import { BetButtonComponent } from "../index";
import { render, screen } from "@testing-library/react";
import { useApi, UseApi } from "../../../services/api/api-service";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../core-theme";
import { selectBets } from "../../../lib/slices/betSlice";
import { SelectMarkets } from "../../../lib/slices/marketSlice";
import {
  selectAccountStatus,
  selectOddsFormat,
} from "../../../lib/slices/settingsSlice";
import { SelectFixtures } from "../../../lib/slices/fixtureSlice";

jest.mock("../../../services/api/api-service");

const mockedSelectBets = selectBets as jest.Mock<any>;
const mockedSelectmMrketsUpdatedData = SelectMarkets as jest.Mock<any>;
const mockedSelectAccountStatus = selectAccountStatus as jest.Mock<any>;
const mockedSelectFixturesUpdatedData = SelectFixtures as jest.Mock<any>;
const mockedSelectOddsFormat = selectOddsFormat as jest.Mock<any>;

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn().mockImplementation(() => {
    return () => {};
  }),
  useSelector: jest.fn().mockImplementation((arg) => {
    switch (arg) {
      case mockedSelectBets:
        return [];
      case mockedSelectmMrketsUpdatedData:
        return {};
      case mockedSelectAccountStatus:
        return "";
      case mockedSelectFixturesUpdatedData:
        return {};
      case mockedSelectOddsFormat:
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
  triggerRefresh: jest.fn(),
  resetHookState: jest.fn(),
  isLoading: false,
  data: null,
  error: false,
});

describe("bet button", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("data display: should show proper selection name", () => {
    render(
      <ThemeProvider theme={theme}>
        <BetButtonComponent
          brandMarketId={"1"}
          marketName={"example market name"}
          fixtureName={"example fixture name"}
          selectionId={"selectionId1"}
          selectionName={"selectionName1"}
          odds={{
            american: "+2000",
            decimal: 1,
            fractional: "20/1",
          }}
          status={"active"}
          fixtureId={"fixture-1"}
          sportId={"sport-1"}
        />
      </ThemeProvider>,
    );

    const selectionName = screen.getByRole("selectionName");
    expect(selectionName.textContent).toBe("selectionName1");
  });

  // test("data display: should show proper odds", () => {
  //   render(
  //     <ThemeProvider theme={theme}>
  //       <BetButtonComponent
  //         brandMarketId={"1"}
  //         marketName={"example market name"}
  //         fixtureName={"example fixture name"}
  //         selectionId={"selectionId1"}
  //         selectionName={"selectionName1"}
  //         odds={{
  //           american: "+2000",
  //           decimal: 1,
  //           fractional: "20/1",
  //         }}
  //       />
  //     </ThemeProvider>,
  //   );

  //   const odds = screen.getByRole("odds");
  //   expect(odds.textContent).toBe("1");
  // });
});
