import { PasswordEditorComponent } from "../password-editor";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";
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

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

mockedUseApiContent.mockReturnValue({
  triggerApi: jest.fn(),
  isLoading: false,
  data: null,
  error: false,
  resetHookState: jest.fn(),
} as any);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("password modal test", () => {
  test("modal: should be invisible before clicking on change button", async () => {
    render(
      <ThemeProvider theme={theme}>
        <PasswordEditorComponent />
      </ThemeProvider>,
    );
    const editForm = screen.queryByText("CHANGE_PASSWORD");
    expect(editForm).toBeNull();
  });

  test("modal: should be visible after clicking on change button", async () => {
    render(
      <ThemeProvider theme={theme}>
        <PasswordEditorComponent />
      </ThemeProvider>,
    );
    const changeButton = screen.getByRole("changeButton");
    userEvent.click(changeButton);
    const editForm = screen.queryByText("CHANGE_PASSWORD");
    expect(editForm).toBeTruthy();
  });

  test("password form: should show alert (OLD_PASSWORD_ERROR) if old password is empty", async () => {
    render(
      <ThemeProvider theme={theme}>
        <PasswordEditorComponent />
      </ThemeProvider>,
    );
    const changeButton = screen.getByRole("changeButton");
    userEvent.click(changeButton);

    const newPassword = screen.getByLabelText("NEW_PASSWORD");
    userEvent.type(newPassword, "xxx");

    const passwordConfirmation = screen.getByLabelText("CONFIRM_PASSWORD");
    userEvent.type(passwordConfirmation, "xxx");

    const updateButton = screen.getByText("UPDATE");
    userEvent.click(updateButton);
    const error = await screen.findByText("OLD_PASSWORD_ERROR");
    expect(error.textContent).toBe("OLD_PASSWORD_ERROR");
  });

  test("password form: should show alert (register:PASSWORD_FORMAT_ERROR) if new password is empty", async () => {
    render(
      <ThemeProvider theme={theme}>
        <PasswordEditorComponent />
      </ThemeProvider>,
    );
    const changeButton = screen.getByRole("changeButton");
    userEvent.click(changeButton);

    const oldPassword = screen.getByLabelText("OLD_PASSWORD");
    userEvent.type(oldPassword, "xxx");

    const passwordConfirmation = screen.getByLabelText("CONFIRM_PASSWORD");
    userEvent.type(passwordConfirmation, "xxx");

    const updateButton = screen.getByText("UPDATE");
    userEvent.click(updateButton);
    const error = await screen.findByText("register:PASSWORD_FORMAT_ERROR");
    expect(error.textContent).toBe("register:PASSWORD_FORMAT_ERROR");
  });

  test("password form: should show alert (CONFIRM_PASSWORD_ERROR) if new password is empty", async () => {
    render(
      <ThemeProvider theme={theme}>
        <PasswordEditorComponent />
      </ThemeProvider>,
    );
    const changeButton = screen.getByRole("changeButton");
    userEvent.click(changeButton);

    const oldPassword = screen.getByLabelText("OLD_PASSWORD");
    userEvent.type(oldPassword, "xxx");

    const newPassword = screen.getByLabelText("NEW_PASSWORD");
    userEvent.type(newPassword, "xxx");

    const updateButton = screen.getByText("UPDATE");
    userEvent.click(updateButton);
    const error = await screen.findByText("CONFIRM_PASSWORD_ERROR");
    expect(error.textContent).toBe("CONFIRM_PASSWORD_ERROR");
  });

  test("password form: should show alert (PASSWORD_NOT_MATCH) if new password and password confirmation are not the sameis empty", async () => {
    render(
      <ThemeProvider theme={theme}>
        <PasswordEditorComponent />
      </ThemeProvider>,
    );
    const changeButton = screen.getByRole("changeButton");
    userEvent.click(changeButton);

    const oldPassword = screen.getByLabelText("OLD_PASSWORD");
    userEvent.type(oldPassword, "xxx");

    const newPassword = screen.getByLabelText("NEW_PASSWORD");
    userEvent.type(newPassword, "xxx");

    const passwordConfirmation = screen.getByLabelText("CONFIRM_PASSWORD");
    userEvent.type(passwordConfirmation, "yyy");

    const updateButton = screen.getByText("UPDATE");
    userEvent.click(updateButton);
    const error = await screen.findByText("PASSWORD_NOT_MATCH");
    expect(error.textContent).toBe("PASSWORD_NOT_MATCH");
  });

  test("personal details form: should show error when error is true", async () => {
    mockedUseApiContent.mockReturnValue({
      triggerApi: jest.fn(),
      isLoading: false,
      data: undefined,
      error: { payload: { errors: [{ errorCode: "fake error" }] } },
      resetHookState: jest.fn(),
    } as any);

    render(
      <ThemeProvider theme={theme}>
        <PasswordEditorComponent />
      </ThemeProvider>,
    );
    const changeButton = screen.getByRole("changeButton");
    userEvent.click(changeButton);

    const error = await screen.findByRole("error");
    expect(error).toBeTruthy();
  });
});
