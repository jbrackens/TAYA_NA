import { DepositLimitsComponent } from "../index";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import { LimitForm } from "../limit-form";

jest.mock("../../../../services/go-api/compliance/compliance-hooks", () => ({
  useSetDepositLimits: jest.fn(() => ({ mutate: jest.fn(), reset: jest.fn(), isLoading: false, error: null, isSuccess: false })),
  useSetStakeLimits: jest.fn(() => ({ mutate: jest.fn(), reset: jest.fn(), isLoading: false, error: null, isSuccess: false })),
  useSetSessionLimits: jest.fn(() => ({ mutate: jest.fn(), reset: jest.fn(), isLoading: false, error: null, isSuccess: false })),
  useCoolOff: jest.fn(() => ({ mutate: jest.fn(), reset: jest.fn(), isLoading: false, error: null, isSuccess: false })),
}));

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

jest.mock("next/router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    query: {},
    pathname: "/",
  })),
}));

describe("deposit limits test", () => {
  test("limits form: should show proper title based on props", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LimitForm
            title={"DEPOSIT_LIMITS"}
            values={{
              daily_limit: null,
              weekly_limit: null,
              monthly_limit: null,
            }}
            url={"deposit"}
            isUserDataLoading={false}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText("DEPOSIT_LIMITS")).toBeTruthy();
  });

  test("limits form: should show proper dailyLimit based on props", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LimitForm
            title={"DEPOSIT_LIMITS"}
            values={{
              daily_limit: 1,
              weekly_limit: null,
              monthly_limit: null,
            }}
            url={"deposit"}
            isUserDataLoading={false}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const input = screen.getByLabelText("DAILY") as HTMLInputElement;
    expect(input.value).toBe("1");
  });

  test("limits form: should show proper monthlyLimit based on props", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LimitForm
            title={"DEPOSIT_LIMITS"}
            values={{
              daily_limit: null,
              weekly_limit: null,
              monthly_limit: 2,
            }}
            url={"deposit"}
            isUserDataLoading={false}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const input = screen.getByLabelText("MONTHLY") as HTMLInputElement;
    expect(input.value).toBe("2");
  });

  test("limits form: should show proper weeklyLimit based on props", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LimitForm
            title={"DEPOSIT_LIMITS"}
            values={{
              daily_limit: null,
              weekly_limit: 3,
              monthly_limit: null,
            }}
            url={"deposit"}
            isUserDataLoading={false}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const input = screen.getByLabelText("WEEKLY") as HTMLInputElement;
    expect(input.value).toBe("3");
  });

  test("limits form: save button should exist and be enabled when not loading", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LimitForm
            title={"DEPOSIT_LIMITS"}
            values={{
              daily_limit: null,
              weekly_limit: null,
              monthly_limit: null,
            }}
            url={"deposit"}
            isUserDataLoading={false}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const saveButton = screen.getByText("SAVE").closest("button") as HTMLButtonElement;
    expect(saveButton).toBeTruthy();
    expect(saveButton.disabled).toBe(false);
  });

  test("limits form: save button should be disabled when user data is loading", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LimitForm
            title={"DEPOSIT_LIMITS"}
            values={{
              daily_limit: null,
              weekly_limit: null,
              monthly_limit: null,
            }}
            url={"deposit"}
            isUserDataLoading={true}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const saveButton = screen.getByText("SAVE").closest("button") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  test("cooloff: at the beginning coolOff modal should be invisible", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <DepositLimitsComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // The confirm button inside the modal should not be visible
    expect(screen.queryByText("responsible-gaming:CONFIRM")).toBeNull();
  });

  test("cooloff: clicking cool off button opens the modal", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <DepositLimitsComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText("responsible-gaming:COOL_OFF"));
    expect(screen.getByText("responsible-gaming:CONFIRM")).toBeTruthy();
  });

  test("cooloff: confirm button is enabled when days >= 3", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <DepositLimitsComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText("responsible-gaming:COOL_OFF"));
    // Default coolOffDays is 3, so the confirm button should be enabled
    const confirmButton = screen.getByText("responsible-gaming:CONFIRM").closest("button") as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(false);
  });
});
