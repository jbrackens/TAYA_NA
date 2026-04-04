import reducer, {
  showForgotPasswordModal,
  hideForgotPasswordModal,
  initialState,
} from "../../../../../lib/slices/authSlice";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useApi } from "../../../../../services/api/api-service";
import { UseApiHook } from "@phoenix-ui/utils";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../../core-theme";
import {
  ForgotResetPasswordModalComponent,
  ForgotResetPasswordModalType,
} from "..";
jest.mock("../../../../../services/api/api-service");

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

const mockedUseApiContent = useApi as jest.Mock<UseApiHook>;

beforeEach(() => {
  jest.clearAllMocks();
});

jest.mock("next/router", () => ({
  useRouter() {
    return {
      prefetch: () => null,
    };
  },
}));

describe("Forgot password modal test", () => {
  test("authSlice: should return the initial state on first run", () => {
    const nextState = initialState;
    const result = reducer(undefined, { type: "any" });
    expect(result).toEqual(nextState);
  });

  test("authSlice: should properly change isForgotPasswordModalVisible to true after showForgotPasswordModal trigger", () => {
    const nextState = reducer(initialState, showForgotPasswordModal());
    expect(nextState.isForgotPasswordModalVisible).toEqual(true);
  });

  test("authSlice: should properly change isForgotPasswordModalVisible to false after hideForgotPasswordModal trigger", () => {
    const testState = {
      isLoginModalVisible: false,
      isRegisterModalVisible: false,
      isForgotPasswordModalVisible: true,
    };
    const nextState = reducer(testState, hideForgotPasswordModal());
    expect(nextState.isForgotPasswordModalVisible).toEqual(false);
  });

  test("ForgotPasswordForm: should show alert (Please input a valid email address) if email is empty", async () => {
    mockedUseApiContent.mockReturnValueOnce({
      triggerApi: jest.fn(),
      isLoading: false,
      data: null,
      error: false,
      resetHookState: jest.fn(),
      triggerRefresh: jest.fn(),
    });
    render(
      <ThemeProvider theme={theme}>
        <ForgotResetPasswordModalComponent
          isVisible={true}
          type={ForgotResetPasswordModalType.FORGOT}
        />
      </ThemeProvider>,
    );
    const forgotPasswordButton = screen.getByRole("forgotPasswordButton");
    userEvent.click(forgotPasswordButton);
    const error = await screen.findByText("EMAIL_ERROR");
    expect(error.textContent).toBe("EMAIL_ERROR");
  });

  test("ForgotPasswordForm: should show alert (Please input a valid email address) if email is invalid", async () => {
    mockedUseApiContent.mockReturnValueOnce({
      triggerApi: jest.fn(),
      isLoading: false,
      data: null,
      error: false,
      resetHookState: jest.fn(),
      triggerRefresh: jest.fn(),
    });
    render(
      <ThemeProvider theme={theme}>
        <ForgotResetPasswordModalComponent
          isVisible={true}
          type={ForgotResetPasswordModalType.RESET}
        />
      </ThemeProvider>,
    );
    const emailInput = screen.getByLabelText("EMAIL");
    const forgotPasswordButton = screen.getByRole("forgotPasswordButton");
    userEvent.type(emailInput, "xxxxxx");
    userEvent.click(forgotPasswordButton);
    const error = await screen.findByText("EMAIL_ERROR");
    expect(error.textContent).toBe("EMAIL_ERROR");
  });

  test("ForgotPasswordForm: should show loading spinner when isLoading is true", async () => {
    mockedUseApiContent.mockReturnValueOnce({
      triggerApi: jest.fn(),
      isLoading: true,
      data: null,
      error: null,
      resetHookState: jest.fn(),
      triggerRefresh: jest.fn(),
    });
    render(
      <ThemeProvider theme={theme}>
        <ForgotResetPasswordModalComponent
          isVisible={true}
          type={ForgotResetPasswordModalType.RESET}
        />
      </ThemeProvider>,
    );
    const loading = await screen.findByRole("loading");
    expect(loading).toBeTruthy();
  });

  test("ForgotPasswordForm: should show error when error is true", async () => {
    mockedUseApiContent.mockReturnValueOnce({
      triggerApi: jest.fn(),
      isLoading: false,
      data: null,
      error: { payload: { errors: [{ errorCode: "error" }] } },
      resetHookState: jest.fn(),
      triggerRefresh: jest.fn(),
    });
    render(
      <ThemeProvider theme={theme}>
        <ForgotResetPasswordModalComponent
          isVisible={true}
          type={ForgotResetPasswordModalType.RESET}
        />
      </ThemeProvider>,
    );
    const error = await screen.findByRole("error");
    expect(error).toBeTruthy();
  });
});
