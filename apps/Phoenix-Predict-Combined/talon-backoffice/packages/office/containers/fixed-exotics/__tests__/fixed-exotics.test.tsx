import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "styled-components";
import FixedExoticsContainer from "..";
import { useApi, UseApi } from "../../../services/api/api-service";
import * as authUtils from "../../../utils/auth";

jest.mock("../../../services/api/api-service");
jest.mock("../../../utils/auth", () => ({
  resolveToken: jest.fn(),
  validateAndCheckEligibility: jest.fn(),
}));

jest.mock("i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const mockedUseApi = useApi as jest.Mock<UseApi>;
const mockedResolveToken = authUtils.resolveToken as jest.Mock;
const mockedValidateAndCheckEligibility =
  authUtils.validateAndCheckEligibility as jest.Mock;

describe("FixedExoticsContainer", () => {
  beforeEach(() => {
    mockedResolveToken.mockReturnValue("token");
    mockedValidateAndCheckEligibility.mockReturnValue(true);
    const listResponse = {
      succeeded: true,
      data: {
        items: [
          {
            quoteId: "feq:local:000101",
            userId: "u-local-1001",
            exoticType: "exacta",
            status: "open",
            encodedTicket: "exacta:home>over",
            combinedOdds: 3.51,
            stakeCents: 500,
            updatedAt: "2026-03-04T10:00:00Z",
          },
        ],
      },
    };
    const auditLogsResponse = {
      succeeded: true,
      data: {
        items: [
          {
            id: "al:local:fixed-exotic:1",
            action: "fixed_exotic.quote.expired",
            actorId: "admin-risk-1",
            targetId: "feq:local:000101",
            occurredAt: "2026-03-04T12:00:00Z",
            details: "manual risk pause",
          },
        ],
      },
    };
    const defaultResponse = {};
    mockedUseApi.mockImplementation((url: string) => {
      if (url === "admin/exotics/fixed/quotes") {
        return [
          jest.fn().mockResolvedValue({}),
          false,
          listResponse,
          jest.fn(),
          jest.fn(),
        ];
      }
      if (url === "admin/audit-logs") {
        return [
          jest.fn().mockResolvedValue({}),
          false,
          auditLogsResponse,
          jest.fn(),
          jest.fn(),
        ];
      }
      return [
        jest.fn().mockResolvedValue({}),
        false,
        defaultResponse,
        jest.fn(),
        jest.fn(),
      ];
    });
  });

  test("renders fixed exotic quotes table", async () => {
    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <FixedExoticsContainer />
      </ThemeProvider>,
    );

    expect(
      (await screen.findAllByText("feq:local:000101")).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("HEADER_QUOTE_ID")).toBeInTheDocument();
    expect(screen.getByText("ACTION_EXPIRE")).toBeInTheDocument();
    expect(screen.getByText("OPS_CARD_TITLE")).toBeInTheDocument();
    expect(
      screen.getByText((value) => value.includes("admin-risk-1")),
    ).toBeInTheDocument();
    expect(screen.getByText("OPS_AUDIT_LOG_LINK")).toBeInTheDocument();
  });

  test("shows read-only warning for non-admin roles", async () => {
    mockedValidateAndCheckEligibility.mockReturnValue(false);

    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <FixedExoticsContainer />
      </ThemeProvider>,
    );

    expect(await screen.findByText("READ_ONLY_WARNING")).toBeInTheDocument();
    expect(
      screen.getByText("OPS_AUDIT_LOG_LINK_ADMIN_ONLY"),
    ).toBeInTheDocument();
  });
});
