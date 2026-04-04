import { SessionTimerComponent } from "../index";
import { render, screen } from "@testing-library/react";
import React from "react";
import { theme } from "../../../../core-theme";
import { ThemeProvider } from "styled-components";
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
  isLoading: false,
  data: {
    currentTime: "2021-07-30T21:27:35.528698Z",
    sessionStartTime: "2021-07-30T21:21:32.288664Z",
  },
  error: false,
} as any);

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
const sessionStorageGetMock = jest.spyOn(
  window.localStorage.__proto__,
  "getItem",
);

const countSetTimeoutCalls = (): number => {
  return (setInterval as unknown as jest.Mock).mock.calls.filter(
    ([fn, t]: [any, any]) => t !== 0 || !String(fn).includes("_flushCallback"),
  ).length;
};

describe("session timer modal", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("modal: should call setTimeout", async () => {
    useSelectorMock.mockReturnValue("Europe/London");
    render(
      <ThemeProvider theme={theme}>
        <SessionTimerComponent />
      </ThemeProvider>,
    );

    expect(countSetTimeoutCalls()).toHaveLength(4);
  });

  test("modal: after 1 ms modal should NOT be visible", async () => {
    useSelectorMock.mockReturnValue("Europe/London");
    useDispatchMock.mockReturnValue(jest.fn);
    render(
      <ThemeProvider theme={theme}>
        <SessionTimerComponent />
      </ThemeProvider>,
    );

    setTimeout(() => {
      expect(screen.queryAllByTestId("sessionTimerModal")).toStrictEqual([]);
    }, 1);
    jest.runOnlyPendingTimers();
  });

  test("modal: after 30 mins and 1 ms modal should be inivisible of sessionStart is too small", async () => {
    useSelectorMock.mockReturnValue("Europe/London");
    useDispatchMock.mockReturnValue(jest.fn);
    sessionStorageGetMock.mockReturnValueOnce("Europe/London");

    render(
      <ThemeProvider theme={theme}>
        <SessionTimerComponent />
      </ThemeProvider>,
    );

    setTimeout(() => {
      expect(screen.queryAllByTestId("sessionTimerModal").length).toBe(0);
    }, 18000001);
    jest.runOnlyPendingTimers();
  });
});
