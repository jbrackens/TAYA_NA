import("jest-fetch-mock");
import { cleanup } from "@testing-library/react";
import dayjs from "dayjs";
import { isString } from "lodash";
import { appendSecondsToTimestamp, PunterRoleEnum } from "@phoenix-ui/utils";
import { resolveToken, validateAndDecode, isEligibleToAccess } from "../auth";
import {
  setupTokensMock,
  TEST_REFRESH_TOKEN,
  TEST_TOKEN,
} from "../../__mocks__/auth-tokens";
import { setupProcessMock } from "../../__mocks__/process";
import { setupLocalStorageMock } from "../../__mocks__/localstorage";
import { extendAuthSession, validateSession, nukeAuth } from "../auth";
import {
  TEST_NEW_TOKEN,
  TEST_NEW_REFRESH_TOKEN,
  TEST_EXP_TOKEN,
  TEST_EXP_REFRESH_TOKEN,
} from "../../__mocks__/auth-tokens";

setupLocalStorageMock();
setupProcessMock();

const fetch = global.fetch;
const localStorage = window.localStorage;

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("next/router", () => ({
  asPath: "some/route",
  push: jest.fn,
}));

describe("Auth utils", () => {
  const getItem = (key: string) => {
    const res = localStorage.getItem(key);
    try {
      return isString(res) ? JSON.parse(res) : res;
    } catch (e) {}
    return res;
  };

  beforeEach(() => {
    cleanup();
    fetch.resetMocks();

    setupTokensMock(localStorage);
  });

  describe("Token", () => {
    test("resolveToken: should resolve token", () => {
      const token = resolveToken();
      expect(token).toBeTruthy();
    });
    test("validateAndDecode: should validate and resolve token", () => {
      const token = resolveToken();
      const resolvedToken = validateAndDecode(token);
      expect(resolvedToken).toBeTruthy();
    });
  });

  describe("Access", () => {
    test("isEligibleToAccess: admin should be eligible to access", () => {
      const token = resolveToken();
      const resolvedToken = validateAndDecode(token);
      const result = isEligibleToAccess(resolvedToken, [PunterRoleEnum.ADMIN]);
      expect(result).toBe(true);
    });

    test("isEligibleToAccess: trader shouldn't be eligible to access", () => {
      const token = resolveToken();
      const resolvedToken = validateAndDecode(token);
      const result = isEligibleToAccess(resolvedToken, [PunterRoleEnum.TRADER]);
      expect(result).toBe(false);
    });

    test("isEligibleToAccess: top-level Go role should be eligible to access", () => {
      const result = isEligibleToAccess(
        {
          role: PunterRoleEnum.OPERATOR,
        } as any,
        [PunterRoleEnum.OPERATOR],
      );

      expect(result).toBe(true);
    });
  });

  describe("Session", () => {
    beforeEach(() => {
      fetch.doMock(async (req) => {
        const body = await req.json();
        if (body.refresh_token === TEST_REFRESH_TOKEN) {
          return Promise.resolve({
            body: JSON.stringify({
              token: TEST_NEW_TOKEN,
              refreshToken: TEST_NEW_REFRESH_TOKEN,
              expiresIn: TEST_EXP_TOKEN,
              refreshExpiresIn: TEST_EXP_REFRESH_TOKEN,
            }),
            status: 200,
          });
        }
        return Promise.reject({ status: 401 });
      });

      setupTokensMock(localStorage);
    });

    test("extendAuthSession: session should be extended", async () => {
      const token = await extendAuthSession(getItem("RefreshToken"));
      const now = dayjs().valueOf();

      expect(token).toBe(TEST_NEW_TOKEN);
      expect(getItem("JdaToken")).toBe(TEST_NEW_TOKEN);
      expect(getItem("RefreshToken")).toBe(TEST_NEW_REFRESH_TOKEN);
      expect(
        dayjs(getItem("JdaTokenExpDate")).diff(
          appendSecondsToTimestamp(TEST_EXP_TOKEN, now),
        ),
      ).toBeLessThan(100);
      expect(
        dayjs(getItem("RefreshTokenExpDate")).diff(
          appendSecondsToTimestamp(TEST_EXP_REFRESH_TOKEN, now),
        ),
      ).toBeLessThan(100);
    });

    test("extendAuthSession: session shouldn't be extended", async () => {
      const token = await extendAuthSession("not-valid-token");
      expect(token).toBe(null);
    });

    test("extendAuthSession: session should be extended from Go refresh payload", async () => {
      fetch.mockResponseOnce(
        JSON.stringify({
          token: {
            token: TEST_NEW_TOKEN,
            refreshToken: TEST_NEW_REFRESH_TOKEN,
            expiresIn: TEST_EXP_TOKEN,
            refreshExpiresIn: TEST_EXP_REFRESH_TOKEN,
          },
        }),
      );

      const token = await extendAuthSession(getItem("RefreshToken"));

      expect(token).toBe(TEST_NEW_TOKEN);
      expect(getItem("JdaToken")).toBe(TEST_NEW_TOKEN);
      expect(getItem("RefreshToken")).toBe(TEST_NEW_REFRESH_TOKEN);
    });

    test("validateSession: session should be valid", async () => {
      const token = await validateSession();
      expect(token).toBe(TEST_TOKEN);
    });
  });

  describe("Clear tokens", () => {
    test("nukeAuth: all tokens should be dropped", () => {
      nukeAuth();
      expect(getItem("JdaToken")).toBe(null);
      expect(getItem("RefreshToken")).toBe(null);
      expect(getItem("JdaTokenExpDate")).toBe(null);
      expect(getItem("RefreshTokenExpDate")).toBe(null);
    });
  });
});
