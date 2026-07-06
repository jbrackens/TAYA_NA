import { ChangePasswordComponent } from "..";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useApi } from "../../../../services/api/api-service";
import { UseApiHook } from "@phoenix-ui/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
jest.mock("../../../../services/api/api-service");

const useRouter = jest.spyOn(require("next/router"), "useRouter");

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

describe("Change password test", () => {

  test("ChangePasswordForm: should show alert (Please input a password) if new password is empty", async () => {
    useRouter.mockImplementationOnce(() => ({
      query: { token: "xxx" },
    }));
    mockedUseApiContent.mockReturnValue({
      triggerApi: jest.fn(),
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
      isLoading: false,
      data: null,
      error: false,
      statusOk: false,
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ChangePasswordComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const confirmPasswordInput = screen.getByLabelText("CONFIRM_PASSWORD");
    const changePasswordButton = screen.getByText("CHANGE_PASSWORD_BUTTON");
    userEvent.type(confirmPasswordInput, "xxxxxx");
    userEvent.click(changePasswordButton);
    const error = await screen.findByText("register:PASSWORD_FORMAT_ERROR");
    expect(error.textContent).toBe("register:PASSWORD_FORMAT_ERROR");
  });

  test("ChangePasswordForm: should show alert (Passwords do not match) if confirm password is empty", async () => {
    useRouter.mockImplementationOnce(() => ({
      query: { token: "xxx" },
    }));
    mockedUseApiContent.mockReturnValue({
      triggerApi: jest.fn(),
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
      isLoading: false,
      data: null,
      error: false,
      statusOk: false,
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ChangePasswordComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const newPasswordInput = screen.getByLabelText("NEW_PASSWORD");
    const changePasswordButton = screen.getByText("CHANGE_PASSWORD_BUTTON");
    userEvent.type(newPasswordInput, "xxxxxx");
    userEvent.click(changePasswordButton);
    const error = await screen.findByText("register:PASSWORD_FORMAT_ERROR");
    expect(error.textContent).toBe("register:PASSWORD_FORMAT_ERROR");
  });

  test("ChangePasswordForm: should show alert (Passwords do not match) if confirm password does not match new password", async () => {
    useRouter.mockImplementationOnce(() => ({
      query: { token: "xxx" },
    }));
    mockedUseApiContent.mockReturnValue({
      triggerApi: jest.fn(),
      triggerRefresh: jest.fn(),
      resetHookState: jest.fn(),
      isLoading: false,
      data: null,
      error: false,
      statusOk: false,
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ChangePasswordComponent />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const newPasswordInput = screen.getByLabelText("NEW_PASSWORD");
    const confirmPasswordInput = screen.getByLabelText("CONFIRM_PASSWORD");
    const changePasswordButton = screen.getByText("CHANGE_PASSWORD_BUTTON");
    userEvent.type(newPasswordInput, "xxx");
    userEvent.type(confirmPasswordInput, "xxxxxx");
    userEvent.click(changePasswordButton);
    const error = await screen.findByText("register:PASSWORD_FORMAT_ERROR");
    expect(error.textContent).toBe("register:PASSWORD_FORMAT_ERROR");
  });
});
