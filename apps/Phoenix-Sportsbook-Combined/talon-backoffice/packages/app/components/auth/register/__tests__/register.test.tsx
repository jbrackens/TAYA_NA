import reducer, {
  showRegisterModal,
  hideRegisterModal,
  initialState,
} from "../../../../lib/slices/authSlice";
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Register modal test", () => {
  test("authSlice: should return the initial state on first run", () => {
    const nextState = initialState;
    const result = reducer(undefined, { type: "any" });
    expect(result).toEqual(nextState);
  });

  test("authSlice: should properly change isRegisterModalVisible to true after showRegisterModal trigger", () => {
    const nextState = reducer(initialState, showRegisterModal());
    expect(nextState.isRegisterModalVisible).toEqual(true);
  });

  test("authSlice: should properly change isRegisterModalVisible to false after hideRegisterModal trigger", () => {
    const testState = {
      isLoginModalVisible: false,
      isRegisterModalVisible: true,
      isForgotPasswordModalVisible: false,
      isLoggedIn: false,
      isWsErrorModalVisible: false,
      isTermsModalVisible: false,
      isResetPasswordModalVisible: false,
      isWsConnected: false,
    };
    const nextState = reducer(testState as any, hideRegisterModal());
    expect(nextState.isRegisterModalVisible).toEqual(false);
  });

  // test("RegisterForm: should show alert (Please input your first name) if firstname is empty", async () => {
  //   mockedUseApiContent.mockReturnValueOnce({
  //     triggerApi: jest.fn(),
  //     isLoading: false,
  //     data: null,
  //     error: false
  //   });
  //   render(<RegisterComponent />);
  //   const usernameInput = screen.getByLabelText("USERNAME");
  //   const titleInput = screen.getByPlaceholderText("LEGAL_TITLE");
  //   const lastNameInput = screen.getByLabelText("LAST_NAME");
  //   const emailInput = screen.getByLabelText("EMAIL");
  //   const passwordInput = screen.getByLabelText("PASSWORD");
  //   const confirmPasswordInput = screen.getByLabelText("CONFIRM_PASSWORD");
  //   const nextButton = screen.getByText("NEXT");

  //   userEvent.type(usernameInput, "username");
  //   userEvent.selectOptions(titleInput, "Mr");
  //   userEvent.type(lastNameInput, "lastname");
  //   userEvent.type(emailInput, "test@test.com");
  //   userEvent.type(passwordInput, "password");
  //   userEvent.type(confirmPasswordInput, "password");
  //   userEvent.click(nextButton);
  //   const error = await screen.findByText("FIRST_NAME_ERROR");
  //   expect(error.textContent).toBe("FIRST_NAME_ERROR");
  // });

  // test("RegisterForm: should show loading spinner when isLoading is true", async () => {
  //   mockedUseApiContent.mockReturnValue({
  //     triggerApi: jest.fn(),
  //     isLoading: true,
  //     data: null,
  //     error: null,
  //     triggerRefresh: jest.fn(),
  //     resetHookState: jest.fn(),
  //   });
  //   render(
  //     <ThemeProvider theme={theme}>
  //       <RegisterComponent />
  //     </ThemeProvider>,
  //   );
  //   const loading = await screen.findByRole("loading");
  //   expect(loading).toBeTruthy();
  // });

  // test("RegisterForm: should show error when error is true", async () => {
  //   mockedUseApiContent.mockReturnValue({
  //     triggerApi: jest.fn(),
  //     isLoading: false,
  //     data: null,
  //     error: { payload: { errors: [{ errorCode: "error message" }] } },
  //     triggerRefresh: jest.fn(),
  //     resetHookState: jest.fn(),
  //   });
  //   render(
  //     <ThemeProvider theme={theme}>
  //       <RegisterComponent />
  //     </ThemeProvider>,
  //   );
  //   const error = await screen.findByRole("error");
  //   expect(error).toBeTruthy();
  // });
});
