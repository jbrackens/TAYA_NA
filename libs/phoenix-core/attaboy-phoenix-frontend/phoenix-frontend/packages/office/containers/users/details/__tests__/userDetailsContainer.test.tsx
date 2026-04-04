import UsersDetailsContainer from "..";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { useApi, UseApi } from "../../../../services/api/api-service";
import { ThemeProvider } from "styled-components";
import { selectBasicData } from "../../../../lib/slices/usersDetailsSlice";
import dayjs from "dayjs";
import { useRouter } from "next/router";

jest.mock("../../../../services/api/api-service");

const mockedSelectBasicData = selectBasicData as jest.Mock<any>;

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn().mockImplementation(() => {
    return () => {};
  }),
  useSelector: jest.fn().mockImplementation((arg) => {
    switch (arg) {
      case mockedSelectBasicData:
        return {
          userId: "1",
          username: "user-test",
          name: {
            title: "Mr/Ms",
            firstName: "testName",
            lastName: "testLastName",
          },
          address: {
            addressLine: "Raritan Road Unit F4B, 1255",
            city: "Clark",
            state: "NJ",
            zipcode: "07001",
            country: "US",
          },
          email: "user+test@test.com",
          phoneNumber: "+441231231231",
          dateOfBirth: {
            day: 12,
            month: 3,
            year: 2019,
          },
          gender: null,
          twoFactorAuthEnabled: false,
          depositLimits: {
            daily: {
              current: {
                limit: 10995,
                since: "2022-03-03T10:49:20.228249-05:00",
              },
            },
            weekly: {
              current: {
                limit: 11995,
                since: "2022-03-03T10:49:20.228249-05:00",
              },
            },
            monthly: {
              current: {
                limit: 12995,
                since: "2022-03-03T10:49:20.228249-05:00",
              },
            },
          },
          stakeLimits: {
            daily: {
              current: {
                limit: 13995,
                since: "2022-03-03T10:49:38.807672-05:00",
              },
            },
            weekly: {
              current: {
                limit: 14995,
                since: "2022-03-03T10:49:38.807672-05:00",
              },
            },
            monthly: {
              current: {
                limit: 15995,
                since: "2022-03-03T10:49:38.807672-05:00",
              },
            },
          },
          sessionLimits: {
            daily: {
              current: {
                limit: {
                  length: 18,
                  unit: "HOURS",
                },
                since: "2022-03-03T10:49:57.925566-05:00",
              },
            },
            weekly: {
              current: {
                limit: {
                  length: 162,
                  unit: "HOURS",
                },
                since: "2022-03-03T10:49:57.925566-05:00",
              },
            },
            monthly: {
              current: {
                limit: {
                  length: 739,
                  unit: "HOURS",
                },
                since: "2022-03-03T10:49:57.925566-05:00",
              },
            },
          },
          communicationPreferences: {
            announcements: false,
            promotions: false,
            subscriptionUpdates: false,
            signInNotifications: true,
          },
          bettingPreferences: {
            autoAcceptBetterOdds: false,
          },
          status: "ACTIVE",
          coolOff: null,
          terms: {
            version: 0,
            acceptedAt: "2022-02-16T15:55:45.803Z",
          },
          hasToAcceptTerms: false,
          signUpDate: "2022-02-16T15:55:45.803Z",
          lastSignIn: "2022-03-16T16:05:14.141Z",
          hasToAcceptResponsibilityCheck: true,
          ssn: "9065",
          verifiedAt: "2022-02-16T10:55:45.903731-05:00",
          isTestAccount: true,
          richStatus: {
            status: "ACTIVE",
          },
        };
      default:
        return [];
    }
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

jest.mock("next/router");
const mockedRouter = useRouter as jest.Mock<any>;

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn().mockImplementation(() => jest.fn()),
  useSelector: jest.fn().mockImplementation(() => {
    return true;
  }),
}));

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

const setMockedApiResponse = (newVar?: any) => {
  mockedUseApiContent.mockReturnValue([
    jest.fn(),
    false,
    {
      succeeded: true,
      data: {
        userId: "1",
        username: "user-test",
        name: {
          title: "Mr/Ms",
          firstName: "testName",
          lastName: "testLastName",
        },
        address: {
          addressLine: "Raritan Road Unit F4B, 1255",
          city: "Clark",
          state: "NJ",
          zipcode: "07001",
          country: "US",
        },
        email: "user+test@test.com",
        phoneNumber: "+441231231231",
        dateOfBirth: { day: 12, month: 3, year: 2019 },
        gender: null,
        twoFactorAuthEnabled: false,
        depositLimits: {
          daily: {
            current: {
              limit: 10995.0,
              since: "2022-03-03T10:49:20.228249-05:00",
            },
          },
          weekly: {
            current: {
              limit: 11995.0,
              since: "2022-03-03T10:49:20.228249-05:00",
            },
          },
          monthly: {
            current: {
              limit: 12995.0,
              since: "2022-03-03T10:49:20.228249-05:00",
            },
          },
        },
        stakeLimits: {
          daily: {
            current: {
              limit: 13995.0,
              since: "2022-03-03T10:49:38.807672-05:00",
            },
          },
          weekly: {
            current: {
              limit: 14995.0,
              since: "2022-03-03T10:49:38.807672-05:00",
            },
          },
          monthly: {
            current: {
              limit: 15995.0,
              since: "2022-03-03T10:49:38.807672-05:00",
            },
          },
        },
        sessionLimits: {
          daily: {
            current: {
              limit: { length: 18, unit: "HOURS" },
              since: "2022-03-03T10:49:57.925566-05:00",
            },
          },
          weekly: {
            current: {
              limit: { length: 162, unit: "HOURS" },
              since: "2022-03-03T10:49:57.925566-05:00",
            },
          },
          monthly: {
            current: {
              limit: { length: 739, unit: "HOURS" },
              since: "2022-03-03T10:49:57.925566-05:00",
            },
          },
        },
        communicationPreferences: {
          announcements: false,
          promotions: false,
          subscriptionUpdates: false,
          signInNotifications: true,
        },
        bettingPreferences: { autoAcceptBetterOdds: false },
        status: "ACTIVE",
        coolOff: null,
        terms: { version: 0, acceptedAt: "2022-02-16T15:55:45.803Z" },
        hasToAcceptTerms: false,
        signUpDate: "2022-02-16T15:55:45.803Z",
        lastSignIn: "2022-03-16T16:05:14.141Z",
        hasToAcceptResponsibilityCheck: true,
        ssn: "9065",
        verifiedAt: "2022-02-16T10:55:45.903731-05:00",
        isTestAccount: true,
        richStatus: { status: "ACTIVE" },
        currentBalance: {
          amount: 1,
          currency: "USD",
        },
        lifetimeDeposits: {
          amount: 1,
          currency: "USD",
        },
        lifetimeWithdrawals: {
          amount: 1,
          currency: "USD",
        },
        netCash: {
          amount: 1,
          currency: "USD",
        },
        openedBets: {
          amount: 1,
          currency: "USD",
        },
        pendingWithdrawals: {
          amount: 1,
          currency: "USD",
        },
      },
      error: undefined,
      ...(newVar ? newVar : {}),
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
  useTranslation: () => ({
    t: (key: string) => {
      switch (key) {
        case "common:DATE_TIME_FORMAT":
          return "MM/DD/YYYY, HH:mm:ss";
        default:
          return key;
      }
    },
  }),
}));

describe("user details container test", () => {
  beforeEach(() => jest.resetModules());

  test("UsersDetailsContainer: should display proper user name", async () => {
    setMockedApiResponse();
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    const userName = await screen.getByRole("punterName");
    expect(userName.textContent).toBe("testName testLastName ");
  });

  test("UsersDetailsContainer: should display proper status active", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    const status = await screen.getByRole("userStatus");
    expect(status.textContent).toBe("CELL_STATUS_ACTIVE");
  });

  test("UsersDetailsContainer: should display proper signup time", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    const signUpTime = await screen.getByRole("userSignUpTime");
    expect(signUpTime.textContent).toBe(
      dayjs("2022-02-16T15:55:45.803Z").format("MM/DD/YYYY, HH:mm:ss"),
    );
  });

  test("UsersDetailsContainer: should display proper verified at time", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    const verifiedAt = await screen.getByRole("verifiedAtTime");
    expect(verifiedAt.textContent).toBe(
      dayjs("2022-02-16T10:55:45.903731-05:00").format("MM/DD/YYYY, HH:mm:ss"),
    );
  });

  test("UsersDetailsContainer: should display proper last login time", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    const lastLogin = await screen.getByRole("lastLogin");
    expect(lastLogin.textContent).toBe(
      dayjs("2022-03-16T16:05:14.141Z").format("MM/DD/YYYY, HH:mm:ss"),
    );
  });

  test("UsersDetailsContainer: should display proper terms acceptance time and version", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    const termsAcceptanceTime = await screen.getByRole("termsAcceptanceTime");
    expect(termsAcceptanceTime.textContent).toBe(
      `${dayjs("2022-02-16T15:55:45.803Z").format(
        "MM/DD/YYYY, HH:mm:ss",
      )} (version: 0)`,
    );
  });

  test("UsersDetailsContainer: add note modal should not be visible before pressing add note button", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(screen.queryByText("Add Note")).not.toBeInTheDocument();
  });

  test("UsersDetailsContainer: add note modal should be visible after pressing add note button", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    const addNoteButton = screen.getByText("ACTION_ADD_NOTE");
    userEvent.click(addNoteButton);
    expect(screen.queryByText("Add Note")).toBeInTheDocument();
  });

  test("UsersDetailsContainer: transaction modal should not be visible before pressing transaction button", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(
      screen.queryByText("TRANSACTION_MODAL_TITLE"),
    ).not.toBeInTheDocument();
  });

  test("UsersDetailsContainer: transaction modal should be visible after pressing transaction button", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    const transactionButton = screen.getByText("ACTION_TRANSACTION");
    userEvent.click(transactionButton);

    expect(screen.queryByText("TRANSACTION_MODAL_TITLE")).toBeInTheDocument();
  });

  test("UsersDetailsContainer: tabs with user details should be in the document", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    const tabs = screen.getByRole("userDetailTabs");
    expect(tabs).toBeInTheDocument();
  });

  test("UsersDetailsContainer: user id should be displayed properly", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    const userId = screen.getByRole("userId");
    expect(userId.textContent).toBe("1");
  });

  test("UsersDetailsContainer: username should be displayed properly", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    const userName = screen.getByRole("userName");
    expect(userName.textContent).toBe("user-test");
  });

  test("UsersDetailsContainer: user phone number should be displayed properly", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    const phoneNumber = screen.getByRole("phoneNumber");
    expect(phoneNumber.textContent).toBe("+441231231231");
  });

  test("UsersDetailsContainer: user ssn should not be visible before clicking reveal button", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    expect(screen.queryByText("9065")).not.toBeInTheDocument();
  });

  test("UsersDetailsContainer: user ssn should be visible after clicking reveal button", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });
    const revealButton = screen.getByText("REVEAL_LINK_TEXT");
    userEvent.click(revealButton);
    expect(screen.queryByText("9065")).toBeInTheDocument();
  });

  test("UsersDetailsContainer: user date of birth should be displayed properly", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    const dateOfBirth = screen.getByRole("dateOfBirth");
    expect(dateOfBirth.textContent).toBe("3/12/2019");
  });

  test("UsersDetailsContainer: user address should be displayed properly", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    const address = screen.getByRole("address");
    expect(address.textContent).toBe(
      "Raritan Road Unit F4B, 1255ClarkNJ07001US",
    );
  });

  test("UsersDetailsContainer: preferences tab content should not be visible before preferences tab click", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: "",
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(
      screen.queryByText("HEADER_CARD_DETAILS_COMMS"),
    ).not.toBeInTheDocument();
  });

  test("UsersDetailsContainer: preferences tab content should be visible when basicDetails query equals preferences", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: {
        basicDetails: "preferences",
      },
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(
      screen.queryByText("HEADER_CARD_DETAILS_ANNOUNCEMENTS"),
    ).toBeInTheDocument();
  });

  test("UsersDetailsContainer: limits tab content should be visible when basicDetails query equals to limits", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: {
        basicDetails: "limits",
      },
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(
      screen.queryByText("HEADER_CARD_LIMITS_DEPOSIT"),
    ).toBeInTheDocument();
  });

  test("UsersDetailsContainer: bets tab content should be visible when activityDetails query equals to betsHistory", async () => {
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: {
        activityDetails: "betsHistory",
      },
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(screen.queryByText("page-bets:HEADER_GAMES")).toBeInTheDocument();
  });

  test("UsersDetailsContainer: transactions tab content should be visible when activityDetails query equals to walletHistory", async () => {
    global.URL.createObjectURL = jest.fn(() => "");
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: {
        activityDetails: "walletHistory",
      },
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(
      screen.queryByText("page-transactions:HEADER_TRANSACTION"),
    ).toBeInTheDocument();
  });

  test("UsersDetailsContainer: session history tab content should be visible when activityDetails query equals to sessionHistory", async () => {
    global.URL.createObjectURL = jest.fn(() => "");
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: {
        activityDetails: "sessionHistory",
      },
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(
      screen.queryByText("page-users-details:HEADER_SESSION_ID"),
    ).toBeInTheDocument();
  });

  test("UsersDetailsContainer: limits history tab content should be visible when activityDetails query equals to limitsHistory", async () => {
    global.URL.createObjectURL = jest.fn(() => "");
    mockedRouter.mockReturnValue({
      route: "/",
      pathname: "",
      query: {
        activityDetails: "limitsHistory",
      },
      asPath: "",
      push: jest.fn,
    });
    render(<UsersDetailsContainer id={1} />, {
      wrapper: AllTheProviders,
    });

    expect(
      screen.queryByText("page-users-details:HEADER_LIMIT_TYPE"),
    ).toBeInTheDocument();
  });
});
