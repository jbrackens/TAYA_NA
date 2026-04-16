import "@testing-library/jest-dom";
import UsersDetailsLimits from "..";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";

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

const AllTheProviders = ({ children }: any) => {
  return <ThemeProvider theme={{ logo: "test.png" }}>{children}</ThemeProvider>;
};

beforeEach(() => {
  jest.clearAllMocks();
});

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("user limits test", () => {
  test("UsersDetailsLimits deposit: should display proper daily deposit value", async () => {
    render(
      <UsersDetailsLimits
        data={{
          daily: {
            current: { limit: 1, since: "" },
          },
          weekly: {
            current: { limit: 2, since: "" },
          },
          monthly: {
            current: { limit: 3, since: "" },
          },
        }}
        label={"testLabel"}
        unit="$"
      />,
      {
        wrapper: AllTheProviders,
      },
    );
    const dailyLimit = await screen.getByRole("daily");
    expect(dailyLimit.textContent).toBe("$1.00");
  });

  test("UsersDetailsLimits deposit: should display proper weekly deposit value", async () => {
    render(
      <UsersDetailsLimits
        data={{
          daily: {
            current: { limit: 1, since: "" },
          },
          weekly: {
            current: { limit: 2, since: "" },
          },
          monthly: {
            current: { limit: 3, since: "" },
          },
        }}
        label={"testLabel"}
        unit="$"
      />,
      {
        wrapper: AllTheProviders,
      },
    );
    const weeklyLimit = await screen.getByRole("weekly");
    expect(weeklyLimit.textContent).toBe("$2.00");
  });

  test("UsersDetailsLimits deposit: should display proper monthly deposit value", async () => {
    render(
      <UsersDetailsLimits
        data={{
          daily: {
            current: { limit: 1, since: "" },
          },
          weekly: {
            current: { limit: 2, since: "" },
          },
          monthly: {
            current: { limit: 3, since: "" },
          },
        }}
        label={"testLabel"}
        unit="$"
      />,
      {
        wrapper: AllTheProviders,
      },
    );
    const monthlyLimit = await screen.getByRole("monthly");
    expect(monthlyLimit.textContent).toBe("$3.00");
  });
});
