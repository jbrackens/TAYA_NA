import reducer, { initialState } from "../../../../lib/slices/authSlice";
import { LoginComponent } from "..";
import { render, screen } from "@testing-library/react";
// import userEvent from "@testing-library/user-event";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { ThemeProvider } from "styled-components";

jest.mock("../../../../services/api/api-service");

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation(() => {
    return true;
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
  useRouter() {
    return {
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
    };
  },
}));

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

const setMockedApiResponse = (
  isLoading: boolean = false,
  error: boolean = false,
) => {
  mockedUseApiContent.mockReturnValue([
    jest.fn(),
    isLoading,
    {
      succeeded: !error,
      data: error ? undefined : null,
      error,
    },
    jest.fn(),
    jest.fn(),
  ]);
};

const AllTheProviders = ({ children }: any) => {
  return <ThemeProvider theme={{ logo: "test.png" }}>{children}</ThemeProvider>;
};

beforeEach(() => {
  jest.clearAllMocks();
});

jest.mock("i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("Login modal test", () => {
  test("authSlice: should return the initial state on first run", () => {
    const nextState = initialState;
    const result = reducer(undefined, { type: "any" });
    expect(result).toEqual(nextState);
  });

  // To be uncommented as more machines become available
  // test("loginForm: should show alert (Please input your password!) if password is empty", async () => {
  //   setMockedApiResponse();
  //   render(<LoginComponent />, {
  //     wrapper: AllTheProviders,
  //   });
  //   const usernameInput = screen.getByLabelText("USERNAME");
  //   const loginButton = screen.getByText("SIGN_IN");
  //   userEvent.type(usernameInput, "username");
  //   userEvent.click(loginButton);
  //   const error = await screen.findByText("PASSWORD_ERROR");
  //   expect(error.textContent).toBe("PASSWORD_ERROR");
  // });

  // test("loginForm: should show alert (Please input your username!) if password is empty", async () => {
  //   setMockedApiResponse();
  //   render(<LoginComponent />, {
  //     wrapper: AllTheProviders,
  //   });
  //   const usernameInput = screen.getByLabelText("PASSWORD");
  //   const loginButton = screen.getByText("SIGN_IN");
  //   userEvent.type(usernameInput, "xxxxx");
  //   userEvent.click(loginButton);
  //   const error = await screen.findByText("USERNAME_ERROR");
  //   expect(error.textContent).toBe("USERNAME_ERROR");
  // });

  test("loginForm: should show loading spinner when isLoading is true", async () => {
    setMockedApiResponse(true);
    render(<LoginComponent />, {
      wrapper: AllTheProviders,
    });
    const loading = await screen.findByTestId("loading");
    expect(loading).toBeTruthy();
  });

  test("loginForm: should show error when error is true", async () => {
    setMockedApiResponse(false, true);
    render(<LoginComponent />, {
      wrapper: AllTheProviders,
    });
    const error = await screen.findByRole("error");
    expect(error).toBeTruthy();
  });
});
