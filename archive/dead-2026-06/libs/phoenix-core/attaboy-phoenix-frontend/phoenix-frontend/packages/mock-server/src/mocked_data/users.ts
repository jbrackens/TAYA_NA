import { find } from "lodash";

export const list = [
  {
    id: 1,
    firstName: "First",
    lastName: "User",
    email: "google@chucknorris.com",
    username: "google@chucknorris.com",
    status: "ACTIVE",
    lastSignIn: new Date().toISOString(),
    dateOfBirth: { day: 1, month: 1, year: 1944 },
  },
  {
    id: 2,
    firstName: "Second",
    lastName: "User",
    email: "test@test.com",
    username: "test@test.com",
    status: "SUSPENDED",
    lastSignIn: new Date(1602444681000 - 5000000).toISOString(),
    dateOfBirth: { day: 2, month: 3, year: 1967 },
  },
  {
    id: 3,
    firstName: "Third",
    lastName: "User",
    email: "unverified-user@test.com",
    username: "unverified-user@test.com",
    status: "UNVERIFIED",
    lastSignIn: new Date(1602444681000 - 5000000).toISOString(),
    dateOfBirth: { day: 2, month: 3, year: 1967 },
  },
  {
    id: 4,
    firstName: "Fourth",
    lastName: "User",
    email: "test@test.com",
    username: "test@test.com",
    status: "ACTIVE",
    lastSignIn: new Date(1602444681000 - 5000000).toISOString(),
    dateOfBirth: { day: 2, month: 3, year: 1967 },
  },
  {
    id: 5,
    firstName: "Fifth",
    lastName: "User",
    email: "test@test.com",
    username: "test@test.com",
    status: "ACTIVE",
    lastSignIn: new Date(1602444681000 - 5000000).toISOString(),
    dateOfBirth: { day: 2, month: 3, year: 1967 },
  },
  {
    id: 6,
    firstName: "Sixth",
    lastName: "User",
    email: "test@test.com",
    username: "test@test.com",
    status: "ACTIVE",
    lastSignIn: new Date(1602444681000 - 5000000).toISOString(),
    dateOfBirth: { day: 2, month: 3, year: 1967 },
  },
];

export const recentActivities = (userId: number) => {
  const user = find(list, (item) => item.id === userId);
  const { lastSignIn } = user;
  return [
    {
      id: `${userId}-1`,
      date: new Date(lastSignIn).toISOString(),
      type: "BET_PLACEMENT",
      data: {
        amount: 10.0,
        unit: "$",
      },
      message: "CS:GO @ ESL Extreme Masters | mouseesports vs. virtus.pro",
    },
    {
      id: `${userId}-2`,
      date: new Date(new Date(lastSignIn).getTime() - 3000000).toISOString(),
      type: "BET_WON",
      data: {
        amount: 50.0,
        unit: "$",
      },
      message: "CS:GO @ ESL Extreme Masters | mouseesports vs. virtus.pro",
    },
    {
      id: `${userId}-3`,
      date: new Date(new Date(lastSignIn).getTime() - 4000000).toISOString(),
      type: "BET_PLACEMENT",
      data: {
        amount: 5.0,
        unit: "$",
      },
      message: "CS:GO @ ESL Extreme Masters | mouseesports vs. virtus.pro",
    },
    {
      id: `${userId}-4`,
      date: new Date(new Date(lastSignIn).getTime() - 5000000).toISOString(),
      type: "SYSTEM_LOGIN",
      data: {
        ip: "10.0.0.1",
        countryCode: "PL",
        country: "Poland",
      },
      message: "Logged into the system",
    },
  ];
};

export const details: any = {
  address: {
    addressLine: "123",
    building: "123",
    city: "123",
    country: "US",
    state: "123",
    zipcode: "021",
  },
  bettingPreferences: {
    autoAcceptBetterOdds: false,
  },
  communicationPreferences: {
    announcements: false,
    promotions: false,
    signInNotifications: true,
    subscriptionUpdates: false,
  },
  dateOfBirth: {
    day: 1,
    month: 1,
    year: 1990,
  },
  depositLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  email: "test021@tests.com",
  gender: "Male",
  hasToAcceptResponsibilityCheck: false,
  hasToAcceptTerms: false,
  lastSignIn: "2021-09-26T10:19:36.123Z",
  name: {
    firstName: "testname",
    lastName: "testlastname",
    title: "Mr",
  },
  phoneNumber: "+111111111",
  sessionLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  signUpDate: "2021-09-26T09:46:53.772Z",
  ssn: "1231",
  stakeLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  status: "ACTIVE",
  terms: {
    acceptedAt: "2021-09-26T09:46:53.772Z",
    version: 0,
  },
  twoFactorAuthEnabled: false,
  userId: "ee8e5d9d-2d40-445f-8fad-c278aba551e2",
  username: "testusername",
};

export const unverifiedProfileDetails: any = {
  address: {
    addressLine: "asdasd",
    city: "asdasa",
    country: "US",
    state: "AS",
    zipcode: "123123",
  },
  bettingPreferences: {
    autoAcceptBetterOdds: false,
  },
  communicationPreferences: {
    announcements: false,
    promotions: false,
    signInNotifications: true,
    subscriptionUpdates: false,
  },
  dateOfBirth: {
    day: 9,
    month: 6,
    year: 1996,
  },
  depositLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  email: "test001@tests.com",
  gender: "Male",
  hasToAcceptResponsibilityCheck: false,
  hasToAcceptTerms: false,
  lastSignIn: "2021-10-21T10:50:35.155Z",
  name: {
    firstName: "Filip",
    lastName: "Lukasik",
    title: "Mr",
  },
  phoneNumber: "+48511690388",
  richStatus: {
    status: "UNVERIFIED",
  },
  sessionLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  signUpDate: "2021-10-21T10:50:18.902Z",
  ssn: "6789",
  stakeLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  status: "UNVERIFIED",
  terms: {
    acceptedAt: "2021-10-21T10:50:18.902Z",
    version: 0,
  },
  twoFactorAuthEnabled: false,
  userId: "e836991d-da41-4892-8db2-3589da0d1d58",
  username: "filiptest001",
};

export const notes = () => {
  const createdAt = new Date(1602444681000 - 5000000).toISOString();
  console.log({ createdAt });
  return [
    {
      id: "ee8e5d9d-2d40-445f-8fad-c278aba551e3",
      createdAt: new Date(createdAt).toISOString(),
      authorId: "ee8e5d9d-2d40-445f-8fad-c278aba551e2",
      authorName: {
        firstName: "Some",
        lastName: "Admin",
      },
      noteType: "MANUAL",
      text: "Some note here",
    },
    {
      id: "ee8e5d9d-2d40-445f-8fad-c278aba551e4",
      createdAt: new Date(
        new Date(createdAt).getTime() - 3000000,
      ).toISOString(),
      authorId: "ee8e5d9d-2d40-445f-8fad-c278aba551e2",
      authorName: {
        firstName: "Some",
        lastName: "Admin",
      },
      noteType: "MANUAL",
      text: "Some note here",
    },
    {
      id: "ee8e5d9d-2d40-445f-8fad-c278aba551e5",
      createdAt: new Date(
        new Date(createdAt).getTime() - 4000000,
      ).toISOString(),
      authorId: "ee8e5d9d-2d40-445f-8fad-c278aba551e2",
      authorName: {
        firstName: "Some",
        lastName: "Admin",
      },
      noteType: "MANUAL",
      text: "Some note here",
    },
    {
      id: "ee8e5d9d-2d40-445f-8fad-c278aba551e6",
      createdAt: new Date(
        new Date(createdAt).getTime() - 5000000,
      ).toISOString(),
      authorId: "",
      noteType: "SYSTEM",
      note: "Account created",
    },
  ];
};
