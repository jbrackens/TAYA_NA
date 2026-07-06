import { IdleActivityComponent } from "../index";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { theme } from "../../../../core-theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "styled-components";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import { useApi, UseApi } from "../../../../services/api/api-service";
import * as reactRedux from "react-redux";

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("../../../../services/api/api-service");

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

mockedUseApiContent.mockReturnValue({
  triggerApi: jest.fn(),
  triggerRefresh: jest.fn(),
  resetHookState: jest.fn(),
  isLoading: false,
  data: null,
  error: false,
});

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

jest.useFakeTimers();

const useSelectorMock = jest.spyOn(reactRedux, "useSelector");
const useDispatchMock = jest.spyOn(reactRedux, "useDispatch");

const countSetTimeoutCalls = () => {
  return (setTimeout as unknown as jest.Mock).mock.calls.filter(
    ([fn, t]: [any, any]) => t !== 0 || !String(fn).includes("_flushCallback"),
  );
};

describe("Idle activity modal", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("modal: should not call setTimeout when user is NOT logged in", async () => {
    useSelectorMock.mockReturnValue(false);
    useDispatchMock.mockReturnValue(jest.fn);
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <IdleActivityComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    expect(countSetTimeoutCalls()).toHaveLength(0);
  });

  test("modal: should call setTimeout 1 time when user is logged in", async () => {
    useSelectorMock.mockReturnValue(true);
    useDispatchMock.mockReturnValue(jest.fn);
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <IdleActivityComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(countSetTimeoutCalls()).toHaveLength(1);
  });

  test("modal: when user is logged in, after 1 ms modal should NOT be visible", async () => {
    useSelectorMock.mockReturnValue(true);
    useDispatchMock.mockReturnValue(jest.fn);
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <IdleActivityComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    setTimeout(() => {
      expect(screen.queryAllByTestId("modalContent")).toStrictEqual([]);
    }, 1);
    jest.runOnlyPendingTimers();
  });

  test("modal: when user is logged in, after 14 mins modal should be visible", async () => {
    useSelectorMock.mockReturnValue(true);
    useDispatchMock.mockReturnValue(jest.fn);
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <IdleActivityComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    setTimeout(() => {
      expect(screen.queryAllByTestId("modalContent").length).toBe(0);
    }, 840001);
    jest.runOnlyPendingTimers();
  });

  test("modal: when user is logged in, after less than 15 mins logOut action is NOT triggered", async () => {
    const dispatchLogOut = jest.fn();
    useSelectorMock.mockReturnValue(true);
    useDispatchMock.mockReturnValue(dispatchLogOut);
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <IdleActivityComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    setTimeout(() => {
      expect(dispatchLogOut).not.toHaveBeenCalled();
    }, 6000);
    jest.runOnlyPendingTimers();
  });

  test("modal: when user is logged in and doing some actions modal should not be visible after 14 mins", async () => {
    const dispatchLogOut = jest.fn();
    useSelectorMock.mockReturnValue(true);
    useDispatchMock.mockReturnValue(dispatchLogOut);
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <IdleActivityComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    setTimeout(() => {
      fireEvent.mouseUp(window);
    }, 60000);

    setTimeout(() => {
      expect(screen.queryAllByTestId("modalContent")).toStrictEqual([]);
    }, 780001);

    jest.runOnlyPendingTimers();
  });

  test("modal: when user is logged in and will move action after 1 minute modal will be visible after next 14 mins", async () => {
    const dispatchLogOut = jest.fn();
    useSelectorMock.mockReturnValue(true);
    useDispatchMock.mockReturnValue(dispatchLogOut);
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <IdleActivityComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    setTimeout(() => {
      fireEvent.mouseUp(window);
    }, 60000);

    setTimeout(() => {
      expect(screen.queryAllByTestId("modalContent").length).toBe(0);
    }, 840001);

    jest.runOnlyPendingTimers();
  });
});
