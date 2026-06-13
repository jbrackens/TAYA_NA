import { LanguageTimeZoneComponent } from "../index";
import { render, screen } from "@testing-library/react";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";
jest.mock("../../../../services/api/api-service");

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation(() => {
    return "Europe/London";
  }),
}));

jest.mock("@phoenix-ui/utils", () => ({
  useLocalStorageVariables: () => ({
    getTimezone: () => "Europe/London",
  }),
  DisplayOddsEnum: { AMERICAN: "AMERICAN" },
  timezones: {
    "Atlantic/Faroe": "(GMT+00:00) Faeroe",
    "Atlantic/Reykjavik": "(GMT+00:00) Reykjavik",
    "Etc/GMT": "(GMT+00:00) GMT (no daylight saving)",
    "Europe/Dublin": "(GMT+00:00) Dublin",
    "Europe/Lisbon": "(GMT+00:00) Lisbon",
    "Europe/London": "(GMT+00:00) London",
  },
}));

jest.mock("i18n", () => ({
  useTranslation: jest.fn().mockImplementation(() => {
    return { t: (x: string) => x };
  }),
  i18n: { language: "en" },
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
  // test("settings: should show english select option if i18n is returning en", async () => {
  //   render(
  //     <ThemeProvider theme={theme}>
  //       <LanguageTimeZoneComponent />
  //     </ThemeProvider>,
  //   );
  //   const englishOption = screen.getByRole("englishOption");
  //   expect(englishOption).toBeTruthy();
  // });

  test("settings: should show london select option if useSelector is returning Europe/London", async () => {
    render(
      <ThemeProvider theme={theme}>
        <LanguageTimeZoneComponent />
      </ThemeProvider>,
    );
    const europeLondonOption = screen.getByRole("Europe/London");
    expect(europeLondonOption).toBeTruthy();
  });
});
