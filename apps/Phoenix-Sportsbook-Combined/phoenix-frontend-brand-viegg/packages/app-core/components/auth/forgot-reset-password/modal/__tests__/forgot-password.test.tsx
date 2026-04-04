import reducer, {
  showForgotPasswordModal,
  hideForgotPasswordModal,
  initialState,
} from "../../../../../lib/slices/authSlice";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../../core-theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import {
  ForgotResetPasswordModalComponent,
  ForgotResetPasswordModalType,
} from "..";

const mockForgotPasswordMutation = {
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
  reset: jest.fn(),
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null as any,
  data: undefined as any,
};

jest.mock("../../../../../services/go-api", () => ({
  useForgotPassword: jest.fn(() => ({ ...mockForgotPasswordMutation })),
}));

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
      isLoggedIn: false,
      isWsErrorModalVisible: false,
      isTermsModalVisible: false,
      isResetPasswordModalVisible: false,
      isWsConnected: false,
    };
    const nextState = reducer(testState, hideForgotPasswordModal());
    expect(nextState.isForgotPasswordModalVisible).toEqual(false);
  });

  test("ForgotPasswordForm: should show alert (Please input a valid email address) if email is empty", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ForgotResetPasswordModalComponent
            isVisible={true}
            type={ForgotResetPasswordModalType.FORGOT}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const forgotPasswordButton = screen.getByRole("forgotPasswordButton");
    userEvent.click(forgotPasswordButton);
    const error = await screen.findByText("EMAIL_ERROR");
    expect(error.textContent).toBe("EMAIL_ERROR");
  });

  test("ForgotPasswordForm: should show alert (Please input a valid email address) if email is invalid", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ForgotResetPasswordModalComponent
            isVisible={true}
            type={ForgotResetPasswordModalType.RESET}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const emailInput = screen.getByLabelText("EMAIL");
    const forgotPasswordButton = screen.getByRole("forgotPasswordButton");
    userEvent.type(emailInput, "xxxxxx");
    userEvent.click(forgotPasswordButton);
    const error = await screen.findByText("EMAIL_ERROR");
    expect(error.textContent).toBe("EMAIL_ERROR");
  });

  test("ForgotPasswordForm: should show loading spinner when isLoading is true", async () => {
    const { useForgotPassword } = require("../../../../../services/go-api");
    (useForgotPassword as jest.Mock).mockReturnValue({ ...mockForgotPasswordMutation, isLoading: true });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ForgotResetPasswordModalComponent
            isVisible={true}
            type={ForgotResetPasswordModalType.RESET}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const loading = await screen.findByRole("loading");
    expect(loading).toBeTruthy();
  });

  test("ForgotPasswordForm: should show error when error is true", async () => {
    const { useForgotPassword } = require("../../../../../services/go-api");
    (useForgotPassword as jest.Mock).mockReturnValue({ ...mockForgotPasswordMutation, error: { payload: { errors: [{ errorCode: "error" }] } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ForgotResetPasswordModalComponent
            isVisible={true}
            type={ForgotResetPasswordModalType.RESET}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const error = await screen.findByRole("error");
    expect(error).toBeTruthy();
  });
});
