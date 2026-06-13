import reducer, {
  showAuthModal,
  hideAuthModal,
  initialState,
} from "../../../../lib/slices/authSlice";
import { LoginComponent } from "..";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useApi } from "../../../../services/api/api-service";
import { UseApiHook } from "@phoenix-ui/utils";
import { ThemeProvider } from "styled-components";
import { theme } from "./../../../../core-theme";
jest.mock("../../../../services/api/api-service");

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn().mockImplementation(() => {
    return () => { };
  }),
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

const mockedUseApiContent = useApi as jest.Mock<UseApiHook>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Login modal test", () => {
  test("authSlice: should return the initial state on first run", () => {
    const nextState = initialState;
    const result = reducer(undefined, { type: "any" });
    expect(result).toEqual(nextState);
  });

  test("authSlice: should properly change isLoginModalVisible to true after showAuthModal trigger", () => {
    const nextState = reducer(initialState, showAuthModal());
    expect(nextState.isLoginModalVisible).toEqual(true);
  });

  test("authSlice: should properly change isLoginModalVisible to false after hideAuthModal trigger", () => {
    const testState = {
      isLoginModalVisible: true,
      isRegisterModalVisible: false,
      isForgotPasswordModalVisible: false,
      isLoggedIn: false,
    };
    const nextState = reducer(testState, hideAuthModal());
    expect(nextState.isLoginModalVisible).toEqual(false);
  });

  test("loginForm: should show alert (Please input your password!) if password is empty", async () => {
    mockedUseApiContent.mockReturnValue({
      triggerApi: jest.fn(),
      isLoading: false,
      data: { token: { token: 'token', refreshToken: 'refreshToken' }, verificationId: 'asdsa' },
      error: false,
      statusOk: true,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    })


    render(
      <ThemeProvider theme={theme}>
        <LoginComponent />
      </ThemeProvider>,
    );
    const usernameInput = screen.getByLabelText("login:USERNAME");
    const loginButton = screen.getByText("login:SIGN_IN");
    userEvent.type(usernameInput, "username");
    userEvent.click(loginButton);
    const error = await screen.findByText("login:PASSWORD_ERROR");
    expect(error.textContent).toBe("login:PASSWORD_ERROR");
  });

  test("loginForm: should show alert (Please input your username!) if password is empty", async () => {
    mockedUseApiContent.mockReturnValue({
      triggerApi: jest.fn(),
      isLoading: false,
      data: { token: { token: 'token', refreshToken: 'refreshToken' }, verificationId: 'asdsa' },
      error: false,
      statusOk: true,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    })

    render(
      <ThemeProvider theme={theme}>
        <LoginComponent />
      </ThemeProvider>,
    );
    const usernameInput = screen.getByLabelText("login:PASSWORD");
    const loginButton = screen.getByText("login:SIGN_IN");
    userEvent.type(usernameInput, "xxxxx");
    userEvent.click(loginButton);
    const error = await screen.findByText("login:USERNAME_ERROR");
    expect(error.textContent).toBe("login:USERNAME_ERROR");
  });

  test("loginForm: should show loading spinner when isLoading is true", async () => {
    mockedUseApiContent.mockReturnValue({
      triggerApi: jest.fn(),
      isLoading: true,
      data: { token: { token: 'token', refreshToken: 'refreshToken' }, verificationId: 'asdsa' },
      error: false,
      statusOk: true,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    })

    render(
      <ThemeProvider theme={theme}>
        <LoginComponent />
      </ThemeProvider>,
    );
    const loading = await screen.findByRole("loading");
    expect(loading).toBeTruthy();
  });

  test("loginForm: should show error when error is true", async () => {
    mockedUseApiContent.mockReturnValue({
      triggerApi: jest.fn(),
      isLoading: false,
      data: { token: { token: 'token', refreshToken: 'refreshToken' }, verificationId: 'asdsa' },
      error: { payload: { errors: [{ errorCode: "error message" }] } },
      statusOk: true,
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
    })

    render(
      <ThemeProvider theme={theme}>
        <LoginComponent />
      </ThemeProvider>,
    );
    const error = await screen.findByRole("error");
    expect(error).toBeTruthy();
  });
});
