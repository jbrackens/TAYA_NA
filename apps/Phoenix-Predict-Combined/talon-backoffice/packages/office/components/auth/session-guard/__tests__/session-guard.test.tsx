import("jest-fetch-mock");
import { render, act, cleanup, screen } from "@testing-library/react";
import { setupProcessMock } from "../../../../__mocks__/process";
import { setupLocalStorageMock } from "../../../../__mocks__/localstorage";
import {
  setupTokensMock,
  TEST_REFRESH_TOKEN,
  TEST_NEW_TOKEN,
  TEST_NEW_REFRESH_TOKEN,
  TEST_EXP_TOKEN,
  TEST_EXP_REFRESH_TOKEN,
} from "../../../../__mocks__/auth-tokens";
import SessionGuard from "../index";
import { useApi, UseApi } from "../../../../services/api/api-service";

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => jest.fn(),
  useSelector: jest.fn().mockImplementation(() => {
    return false;
  }),
}));

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("../../../../services/api/api-service");

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

mockedUseApiContent.mockReturnValue([
  () => Promise.resolve(),
  false,
  {},
  () => Promise.resolve(),
  () => {},
]);

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

setupLocalStorageMock();
setupProcessMock();

const fetch = global.fetch;
const localStorage = window.localStorage;

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("next/router", () => ({
  route: "/",
  pathname: "some/path",
  query: "",
  asPath: "some/path",
  push: jest.fn(),
  useRouter: jest.fn(),
}));

const useRouter = jest.spyOn(require("next/router"), "useRouter");

useRouter.mockImplementation(() => ({
  route: "/",
  pathname: "some/path",
  query: "",
  asPath: "some/path",
  push: jest.fn(),
}));

jest.mock("i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("Session Guard HOC", () => {
  beforeEach(() => {
    cleanup();
    fetch.resetMocks();

    fetch.doMock(async (req) => {
      const body = await req.json();
      if (body.refresh_token === TEST_REFRESH_TOKEN) {
        return Promise.resolve({
          body: JSON.stringify({
            token: TEST_NEW_TOKEN,
            refreshToken: TEST_NEW_REFRESH_TOKEN,
            expiresIn: TEST_EXP_TOKEN,
            refreshExpiresIn: TEST_EXP_REFRESH_TOKEN,
          }),
          status: 200,
        });
      }
      return Promise.reject({ status: 401 });
    });

    setupTokensMock(localStorage);
  });

  afterEach(() => {
    fetch.mockRestore();
  });

  test("Should display the content", async () => {
    await act(async () => {
      render(<SessionGuard>visible</SessionGuard>);
    });

    const result = await screen.findByText("visible");

    expect(result.textContent).toBe("visible");
  });
});
