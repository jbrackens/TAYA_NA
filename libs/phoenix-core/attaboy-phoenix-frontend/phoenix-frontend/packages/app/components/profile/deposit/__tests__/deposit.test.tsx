import { DepositLimitsComponent } from "../index";
import { render, screen, fireEvent } from "@testing-library/react";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";
import { LimitForm } from "../limit-form";
import { LimitEnum } from "../../../../lib/slices/settingsSlice";
jest.mock("../../../../services/api/api-service");

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation(() => {
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
});

describe("deposit limits test", () => {
  test("limits form: should show proper title based on props", () => {
    render(
      <ThemeProvider theme={theme}>
        <LimitForm
          title={"DEPOSIT_LIMITS"}
          values={{
            daily: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            monthly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            weekly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
          }}
          url={"deposit"}
          type={LimitEnum.DEPOSIT}
          isUserDataLoading={false}
        />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId("title")?.textContent).toBe("DEPOSIT_LIMITS");
  });

  test("limits form: should show proper dailyLimit based on props", () => {
    render(
      <ThemeProvider theme={theme}>
        <LimitForm
          title={"DEPOSIT_LIMITS"}
          values={{
            daily: {
              current: {
                limit: 1,
                since: "1970-01-01T00:00:00Z",
              },
            },
            monthly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            weekly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
          }}
          url={"deposit"}
          type={LimitEnum.DEPOSIT}
          isUserDataLoading={false}
        />
      </ThemeProvider>,
    );

    expect(
      (screen.queryByTestId("dailyLimit") as HTMLInputElement)?.value,
    ).toBe("$ 1");
  });

  test("limits form: should show proper monthlyLimit based on props", () => {
    render(
      <ThemeProvider theme={theme}>
        <LimitForm
          title={"DEPOSIT_LIMITS"}
          values={{
            daily: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            monthly: {
              current: {
                limit: 2,
                since: "1970-01-01T00:00:00Z",
              },
            },
            weekly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
          }}
          url={"deposit"}
          type={LimitEnum.DEPOSIT}
          isUserDataLoading={false}
        />
      </ThemeProvider>,
    );

    expect(
      (screen.queryByTestId("monthlyLimit") as HTMLInputElement)?.value,
    ).toBe("$ 2");
  });

  test("limits form: should show proper weeklyLimit based on props", () => {
    render(
      <ThemeProvider theme={theme}>
        <LimitForm
          title={"DEPOSIT_LIMITS"}
          values={{
            daily: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            monthly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            weekly: {
              current: {
                limit: 3,
                since: "1970-01-01T00:00:00Z",
              },
            },
          }}
          url={"deposit"}
          type={LimitEnum.DEPOSIT}
          isUserDataLoading={false}
        />
      </ThemeProvider>,
    );

    expect(
      (screen.queryByTestId("weeklyLimit") as HTMLInputElement)?.value,
    ).toBe("$ 3");
  });

  test("limits form: at the beginning save button should be disabled", () => {
    render(
      <ThemeProvider theme={theme}>
        <LimitForm
          title={"DEPOSIT_LIMITS"}
          values={{
            daily: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            monthly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            weekly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
          }}
          url={"deposit"}
          type={LimitEnum.DEPOSIT}
          isUserDataLoading={false}
        />
      </ThemeProvider>,
    );

    expect(
      (screen.queryByTestId("saveButton") as HTMLButtonElement)?.disabled,
    ).toBe(true);
  });

  test("limits form: after changing daily limit value to the initial save button should be disabled", () => {
    render(
      <ThemeProvider theme={theme}>
        <LimitForm
          title={"DEPOSIT_LIMITS"}
          values={{
            daily: {
              current: {
                limit: 1,
                since: "1970-01-01T00:00:00Z",
              },
            },
            monthly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
            weekly: {
              current: {
                limit: null,
                since: "1970-01-01T00:00:00Z",
              },
            },
          }}
          url={"deposit"}
          type={LimitEnum.DEPOSIT}
          isUserDataLoading={false}
        />
      </ThemeProvider>,
    );

    const input = screen.queryByTestId("dailyLimit");

    fireEvent.change(input, { target: { value: 1 } });

    expect(
      (screen.queryByTestId("saveButton") as HTMLButtonElement)?.disabled,
    ).toBe(true);
  });

  test("cooloff: at the beginning coolOff modal should be invisible", () => {
    render(
      <ThemeProvider theme={theme}>
        <DepositLimitsComponent />
      </ThemeProvider>,
    );

    expect(screen.queryAllByTestId("coolOffModalForm")).toStrictEqual([]);
  });

  test("cooloff: cool of period cant be empty", async () => {
    render(
      <ThemeProvider theme={theme}>
        <DepositLimitsComponent />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId("coolOffButton"));
    fireEvent.click(screen.getByTestId("startCoolOffButton"));
    const error = await screen.findByText("DAYS_ERROR");
    expect(error.textContent).toBe("DAYS_ERROR");
  });

  test("cooloff: cool of period must be at least 3 days", async () => {
    render(
      <ThemeProvider theme={theme}>
        <DepositLimitsComponent />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId("coolOffButton"));
    fireEvent.click(screen.getByTestId("startCoolOffButton"));
    const input = screen.queryByTestId("coolOffInput");
    fireEvent.change(input, { target: { value: 1 } });
    const error = await screen.findByText("DAYS_MIN_ERROR");
    expect(error.textContent).toBe("DAYS_MIN_ERROR");
  });
});
