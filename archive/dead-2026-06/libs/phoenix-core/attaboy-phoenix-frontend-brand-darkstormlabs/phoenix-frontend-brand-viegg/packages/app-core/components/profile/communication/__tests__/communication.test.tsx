import { CommunicationComponent } from "../index";
import { render, screen } from "@testing-library/react";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";
jest.mock("../../../../services/api/api-service");

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation(() => {
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("communication component test", () => {
  test("communication settings: should display proper checkbox value for ESP_ANNOUNCEMENTS at beggining (false)", async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CommunicationComponent />
      </ThemeProvider>,
    );

    expect(
      container
        .querySelector("#communicationStyledForm_announcements")
        ?.getAttribute("aria-checked"),
    ).toBe("false");
  });

  test("communication settings: should display proper checkbox value for SIGN_IN_NOTIFICATIONS after click (true)", async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CommunicationComponent />
      </ThemeProvider>,
    );

    const checkbox = container.querySelector(
      "#communicationStyledForm_signInNotifications",
    );
    checkbox?.click();

    expect(
      container
        .querySelector("#communicationStyledForm_signInNotifications")
        ?.getAttribute("aria-checked"),
    ).toBe("true");
  });

  test("communication settings: should display proper checkbox value for ESP_PROMOTIONS at beggining (false)", async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CommunicationComponent />
      </ThemeProvider>,
    );

    expect(
      container
        .querySelector("#communicationStyledForm_promotions")
        ?.getAttribute("aria-checked"),
    ).toBe("false");
  });

  test("communication settings: should display proper checkbox value for ESP_PROMOTIONS after click (true)", async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CommunicationComponent />
      </ThemeProvider>,
    );

    const checkbox = container.querySelector(
      "#communicationStyledForm_promotions",
    );
    checkbox?.click();

    expect(
      container
        .querySelector("#communicationStyledForm_promotions")
        ?.getAttribute("aria-checked"),
    ).toBe("true");
  });

  test("communication settings: should display proper checkbox value for SIGN_IN_NOTIFICATIONS at beggining (false)", async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CommunicationComponent />
      </ThemeProvider>,
    );

    expect(
      container
        .querySelector("#communicationStyledForm_signInNotifications")
        ?.getAttribute("aria-checked"),
    ).toBe("false");
  });

  test("communication settings: should display proper checkbox value for SIGN_IN_NOTIFICATIONS after click (true)", async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <CommunicationComponent />
      </ThemeProvider>,
    );

    const checkbox = container.querySelector(
      "#communicationStyledForm_signInNotifications",
    );
    checkbox?.click();

    expect(
      container
        .querySelector("#communicationStyledForm_signInNotifications")
        ?.getAttribute("aria-checked"),
    ).toBe("true");
  });
});
