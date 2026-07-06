import { ModalTypeEnum, PersonalDetailsComponent } from "../index";
import { render, screen } from "@testing-library/react";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../core-theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import { useTimezone } from "@phoenix-ui/utils";

jest.mock("../../../../services/api/api-service");

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation(() => {
    return "Europe/London";
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
  triggerRefresh: jest.fn(),
  resetHookState: jest.fn(),
  isLoading: false,
  data: null,
  error: false,
});

const DetailsComponent = (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <PersonalDetailsComponent
        username={"testUsername"}
        phoneNumber={"123123123"}
        email={"test@test.com"}
        name={{
          firstName: "firstName",
          lastName: "lastName",
          title: "mr",
        }}
        address={{
          country: "US",
          addressLine: "addressLine",
          city: "city",
          state: "state",
          zipcode: "123",
        }}
        dateOfBirth={{
          day: 1,
          month: 1,
          year: 1990,
        }}
        terms={undefined}
        hasToAcceptTerms={false}
        signUpDate={"2021-04-14T09:58:26.564Z"}
      />
    </ThemeProvider>
  </QueryClientProvider>
);

describe("personal details test", () => {
  test("data display: should show proper username", () => {
    render(DetailsComponent);

    const userName = screen.getByRole("username");
    expect(userName.textContent).toBe("testUsername");
  });

  test("data display: should show proper name", () => {
    render(DetailsComponent);

    const name = screen.getByRole("name");
    expect(name.textContent).toBe("firstName lastName");
  });

  test("data display: should show proper email", () => {
    render(DetailsComponent);

    const email = screen.getByRole("email");
    expect(email.textContent).toBe("test@test.com");
  });

  test("data display: should show proper date of birth", () => {
    const { getTimeWithTimezone } = useTimezone();
    render(DetailsComponent);

    const dob = screen.getByRole("dob");

    expect(dob.textContent).toBe(getTimeWithTimezone(`1-1-1990`).format("ll"));
  });

  test("data display: should show proper phone number", () => {
    render(DetailsComponent);

    const phone = screen.getByRole("phone");
    expect(phone.textContent).toBe("123123123");
  });

  test("data display: should show proper address", () => {
    render(DetailsComponent);

    const address = screen.getByRole("address");
    expect(address.textContent).toBe("addressLine city state US 123");
  });

  test("modal: should change currentModal state on change click", () => {
    render(DetailsComponent);
    const change = screen.getByRole(ModalTypeEnum.CHANGE_EMAIL);
    change.click();
    const editForm = screen.getByRole("editForm");

    expect(editForm).toBeTruthy();
  });

  test("modal: should show modal on change click", () => {
    render(DetailsComponent);
    const change = screen.getByRole(ModalTypeEnum.CHANGE_EMAIL);
    change.click();
    const editForm = screen.getByRole("editForm");

    expect(editForm).toBeTruthy();
  });

  test("modal: should show proper modal to edit email after email change click", () => {
    render(DetailsComponent);
    const change = screen.getByRole(ModalTypeEnum.CHANGE_EMAIL);
    change.click();
    const editEmailInput = screen.getByLabelText("EMAIL");

    expect(editEmailInput).toBeTruthy();
  });

  test("modal: should show proper modal to edit email after mobile change click", () => {
    render(DetailsComponent);
    const change = screen.getByRole(ModalTypeEnum.CHANGE_PHONE);
    change.click();
    const editMobileInput = screen.getByLabelText("register:MOBILE");

    expect(editMobileInput).toBeTruthy();
  });

  test("modal: should show proper modal to edit address after address change click", () => {
    render(DetailsComponent);
    const change = screen.getByRole(ModalTypeEnum.CHANGE_ADDRESS);
    change.click();
    const editAddressInput = screen.getByLabelText("ADDRESS_LINE");

    expect(editAddressInput).toBeTruthy();
  });
});
