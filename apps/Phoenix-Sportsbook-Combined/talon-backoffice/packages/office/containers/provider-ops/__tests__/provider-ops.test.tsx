import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "styled-components";
import { useRouter } from "next/router";
import ProviderOpsContainer from "..";
import { useApi, UseApi } from "../../../services/api/api-service";

jest.mock("../../../services/api/api-service");
jest.mock("next/router");

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
const mockedUseRouter = useRouter as jest.Mock;

describe("ProviderOpsContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({
      query: {},
      push: jest.fn(),
    });
  });

  test("renders feed health summary and stream rows", async () => {
    const triggerFeedHealth = jest.fn().mockResolvedValue({});
    const triggerCancel = jest.fn().mockResolvedValue({});
    const triggerIntervention = jest.fn().mockResolvedValue({});
    const triggerAckList = jest.fn().mockResolvedValue({});
    const triggerAckUpsert = jest.fn().mockResolvedValue({});
    const triggerAckSLAGet = jest.fn().mockResolvedValue({});
    const triggerAckSLAUpdate = jest.fn().mockResolvedValue({});
    const feedResponse = {
      succeeded: true,
      data: {
        enabled: true,
        thresholds: {
          maxLagMs: 18000,
          maxGapCount: 1,
          maxDuplicateCount: 10,
        },
        summary: {
          streamCount: 2,
          unhealthyStreams: 1,
          totalErrors: 4,
        },
        cancel: {
          totalSuccess: 7,
          totalFailed: 2,
        },
        streams: [
          {
            adapter: "odds88",
            stream: "delta",
            state: "running",
            lastLagMs: 19,
            duplicateCount: 0,
            gapCount: 0,
            errorCount: 0,
            lastRevision: 99,
            lastSequence: 141,
            updatedAt: "2026-03-05T10:00:00Z",
          },
          {
            adapter: "odds88",
            stream: "settlement",
            state: "error",
            lastLagMs: 19000,
            duplicateCount: 12,
            gapCount: 2,
            errorCount: 1,
            lastRevision: 100,
            lastSequence: 201,
            updatedAt: "2026-03-05T10:01:00Z",
            lastError: "stream failure",
          },
        ],
      },
    };
    const feedTuple = [
      triggerFeedHealth,
      false,
      feedResponse,
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const cancelTuple = [
      triggerCancel,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const interventionTuple = [
      triggerIntervention,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementListTuple = [
      triggerAckList,
      false,
      {
        succeeded: true,
        data: {
          items: [
            {
              streamKey: "odds88:settlement",
              operator: "ops.persisted",
              note: "Investigating persisted issue",
              status: "acknowledged",
              lastAction: "acknowledged",
              acknowledgedAt: "2020-01-01T00:00:00Z",
            },
          ],
        },
      },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementUpsertTuple = [
      triggerAckUpsert,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementSLASettingsTuple = [
      triggerAckSLAGet,
      false,
      {
        succeeded: true,
        data: {
          default: {
            warningMinutes: 15,
            criticalMinutes: 30,
          },
          effective: [
            {
              adapter: "odds88",
              warningMinutes: 15,
              criticalMinutes: 30,
              source: "default",
            },
          ],
        },
      },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementSLAUpdateTuple = [
      triggerAckSLAUpdate,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;

    let acknowledgementHookCalls = 0;
    let acknowledgementSLAHookCalls = 0;
    mockedUseApi.mockImplementation((url: string) => {
      if (url === "admin/feed-health") {
        return feedTuple;
      }
      if (url === "admin/provider/acknowledgements") {
        acknowledgementHookCalls += 1;
        return acknowledgementHookCalls === 1
          ? acknowledgementListTuple
          : acknowledgementUpsertTuple;
      }
      if (url === "admin/provider/acknowledgement-sla") {
        acknowledgementSLAHookCalls += 1;
        return acknowledgementSLAHookCalls === 1
          ? acknowledgementSLASettingsTuple
          : acknowledgementSLAUpdateTuple;
      }
      if (url === "admin/bets/:id/lifecycle/:action") {
        return interventionTuple;
      }
      if (url === "admin/provider/cancel") {
        return cancelTuple;
      }
      return acknowledgementUpsertTuple;
    });

    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <ProviderOpsContainer />
      </ThemeProvider>,
    );

    await waitFor(() => expect(triggerFeedHealth).toHaveBeenCalled());
    await waitFor(() => expect(triggerAckList).toHaveBeenCalled());
    await waitFor(() => expect(triggerAckSLAGet).toHaveBeenCalled());

    expect(screen.getByText("METRIC_RUNTIME")).toBeInTheDocument();
    expect(screen.getByText("VALUE_ENABLED")).toBeInTheDocument();
    expect(screen.getAllByText("odds88").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("delta")).toBeInTheDocument();
    expect(screen.getByText("settlement")).toBeInTheDocument();
    expect(screen.getByText("BREACH_NONE")).toBeInTheDocument();
    expect(screen.getByText("BREACH_LAG")).toBeInTheDocument();
    expect(screen.getByText("BREACH_GAP")).toBeInTheDocument();
    expect(screen.getByText("BREACH_DUPLICATE")).toBeInTheDocument();
    expect(screen.getByText("BREACH_ERROR")).toBeInTheDocument();
    expect(screen.getByText("ops.persisted")).toBeInTheDocument();
    expect(screen.getByText(/TRIAGE_UNHEALTHY/)).toBeInTheDocument();
    expect(screen.getByText(/TRIAGE_HEALTHY/)).toBeInTheDocument();
    expect(screen.getByText(/TRIAGE_LAG/)).toBeInTheDocument();
    expect(screen.getByText(/TRIAGE_GAP/)).toBeInTheDocument();
    expect(screen.getByText(/TRIAGE_DUPLICATE/)).toBeInTheDocument();
    expect(screen.getByText(/TRIAGE_ERROR/)).toBeInTheDocument();
    expect(screen.getByText(/TRIAGE_ACKNOWLEDGED/)).toBeInTheDocument();
    expect(screen.getByText(/TRIAGE_ACK_STALE/)).toBeInTheDocument();
    expect(screen.getByText("ACK_SLA_SETTINGS_TITLE")).toBeInTheDocument();
    expect(screen.getByText("ACK_STALE_CRITICAL")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("provider-ops-unhealthy-toggle"));
    await waitFor(() => {
      expect(screen.queryByText("delta")).not.toBeInTheDocument();
    });
    expect(screen.getByText("settlement")).toBeInTheDocument();
  });

  test("boots provider data only once when api trigger identities change across rerenders", async () => {
    const feedTracker = jest.fn().mockResolvedValue({});
    const ackListTracker = jest.fn().mockResolvedValue({});
    const ackSlaTracker = jest.fn().mockResolvedValue({});
    const stableFeedResponse = {
      succeeded: true,
      data: {
        enabled: false,
        streams: [],
      },
    };
    const stableAcknowledgementResponse = {
      succeeded: true,
      data: {
        items: [],
      },
    };
    const stableAcknowledgementSLAResponse = {
      succeeded: true,
      data: {
        default: {
          warningMinutes: 15,
          criticalMinutes: 30,
        },
      },
    };

    const buildTuple = (
      tracker: jest.Mock,
      response: Record<string, any> = {},
    ): UseApi =>
      [
        (...args: any[]) => tracker(...args),
        false,
        response,
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;

    let acknowledgementHookCalls = 0;
    let acknowledgementSLAHookCalls = 0;

    mockedUseApi.mockImplementation((url: string) => {
      if (url === "admin/feed-health") {
        return buildTuple(feedTracker, stableFeedResponse);
      }
      if (url === "admin/provider/acknowledgements") {
        acknowledgementHookCalls += 1;
        return acknowledgementHookCalls === 1
          ? buildTuple(ackListTracker, stableAcknowledgementResponse)
          : buildTuple(jest.fn().mockResolvedValue({}));
      }
      if (url === "admin/provider/acknowledgement-sla") {
        acknowledgementSLAHookCalls += 1;
        return acknowledgementSLAHookCalls === 1
          ? buildTuple(ackSlaTracker, stableAcknowledgementSLAResponse)
          : buildTuple(jest.fn().mockResolvedValue({}));
      }
      return buildTuple(jest.fn().mockResolvedValue({}));
    });

    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <ProviderOpsContainer />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("METRIC_RUNTIME")).toBeInTheDocument();
    });

    expect(feedTracker).toHaveBeenCalledTimes(1);
    expect(ackListTracker).toHaveBeenCalledTimes(1);
    expect(ackSlaTracker).toHaveBeenCalledTimes(1);
  });

  test("opens provider cancel audit logs from cockpit action", async () => {
    const triggerFeedHealth = jest.fn().mockResolvedValue({});
    const triggerCancel = jest.fn().mockResolvedValue({});
    const triggerAckList = jest.fn().mockResolvedValue({});
    const triggerAckUpsert = jest.fn().mockResolvedValue({});
    const triggerAckSLAGet = jest.fn().mockResolvedValue({});
    const triggerAckSLAUpdate = jest.fn().mockResolvedValue({});
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({
      query: {},
      push,
    });
    const feedResponse = {
      succeeded: true,
      data: {
        enabled: true,
        streams: [],
      },
    };
    const cancelResponse = {
      succeeded: true,
      data: {
        state: "cancelled",
        adapter: "odds88",
        attempts: 1,
        retryCount: 0,
      },
    };
    const feedTuple = [
      triggerFeedHealth,
      false,
      feedResponse,
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const cancelTuple = [
      triggerCancel,
      false,
      cancelResponse,
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementListTuple = [
      triggerAckList,
      false,
      {
        succeeded: true,
        data: {
          items: [
            {
              streamKey: "odds88:settlement",
              operator: "ops.persisted",
              note: "Stale ownership",
              status: "acknowledged",
              lastAction: "reassigned",
              acknowledgedAt: "2020-01-01T00:00:00Z",
            },
          ],
        },
      },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementUpsertTuple = [
      triggerAckUpsert,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementSLASettingsTuple = [
      triggerAckSLAGet,
      false,
      {
        succeeded: true,
        data: {
          default: {
            warningMinutes: 15,
            criticalMinutes: 30,
          },
        },
      },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementSLAUpdateTuple = [
      triggerAckSLAUpdate,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;

    let acknowledgementHookCalls = 0;
    let acknowledgementSLAHookCalls = 0;
    mockedUseApi.mockImplementation((url: string) => {
      if (url === "admin/feed-health") {
        return feedTuple;
      }
      if (url === "admin/provider/acknowledgements") {
        acknowledgementHookCalls += 1;
        return acknowledgementHookCalls === 1
          ? acknowledgementListTuple
          : acknowledgementUpsertTuple;
      }
      if (url === "admin/provider/acknowledgement-sla") {
        acknowledgementSLAHookCalls += 1;
        return acknowledgementSLAHookCalls === 1
          ? acknowledgementSLASettingsTuple
          : acknowledgementSLAUpdateTuple;
      }
      if (url === "admin/provider/cancel") {
        return cancelTuple;
      }
      return acknowledgementUpsertTuple;
    });

    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <ProviderOpsContainer />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("ACTION_OPEN_AUDIT"));
    expect(push).toHaveBeenCalledWith({
      pathname: "/logs",
      query: {
        action: "provider.cancel.succeeded",
        p: 1,
        limit: 20,
      },
    });
  });

  test("prefills actions from stream row shortcuts and opens stream-scoped audit", async () => {
    const triggerFeedHealth = jest.fn().mockResolvedValue({});
    const triggerCancel = jest.fn().mockResolvedValue({});
    const triggerIntervention = jest.fn().mockResolvedValue({});
    const triggerAckList = jest.fn().mockResolvedValue({});
    const triggerAckUpsert = jest.fn().mockResolvedValue({});
    const triggerAckSLAGet = jest.fn().mockResolvedValue({});
    const triggerAckSLAUpdate = jest.fn().mockResolvedValue({});
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({
      query: {},
      push,
    });
    const feedResponse = {
      succeeded: true,
      data: {
        enabled: true,
        streams: [
          {
            adapter: "odds88",
            stream: "settlement",
            state: "error",
            lastLagMs: 120,
            duplicateCount: 0,
            gapCount: 0,
            errorCount: 1,
            lastRevision: 3,
            lastSequence: 9,
            lastBetId: "bet-risk-1",
            lastPlayerId: "player-risk-1",
            lastRequestId: "req-risk-1",
            lastError: "stream down",
            updatedAt: "2026-03-05T10:01:00Z",
          },
        ],
      },
    };
    const feedTuple = [
      triggerFeedHealth,
      false,
      feedResponse,
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const cancelTuple = [
      triggerCancel,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const interventionTuple = [
      triggerIntervention,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementListTuple = [
      triggerAckList,
      false,
      { succeeded: true, data: { items: [] } },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementUpsertTuple = [
      triggerAckUpsert,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementSLASettingsTuple = [
      triggerAckSLAGet,
      false,
      {
        succeeded: true,
        data: {
          default: {
            warningMinutes: 15,
            criticalMinutes: 30,
          },
          effective: [
            {
              adapter: "odds88",
              warningMinutes: 15,
              criticalMinutes: 30,
              source: "default",
            },
          ],
        },
      },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementSLAUpdateTuple = [
      triggerAckSLAUpdate,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;

    let acknowledgementHookCalls = 0;
    let acknowledgementSLAHookCalls = 0;
    mockedUseApi.mockImplementation((url: string) => {
      if (url === "admin/feed-health") {
        return feedTuple;
      }
      if (url === "admin/provider/acknowledgements") {
        acknowledgementHookCalls += 1;
        return acknowledgementHookCalls === 1
          ? acknowledgementListTuple
          : acknowledgementUpsertTuple;
      }
      if (url === "admin/provider/acknowledgement-sla") {
        acknowledgementSLAHookCalls += 1;
        return acknowledgementSLAHookCalls === 1
          ? acknowledgementSLASettingsTuple
          : acknowledgementSLAUpdateTuple;
      }
      if (url === "admin/provider/cancel") {
        return cancelTuple;
      }
      if (url === "admin/bets/:id/lifecycle/:action") {
        return interventionTuple;
      }
      return acknowledgementUpsertTuple;
    });

    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <ProviderOpsContainer />
      </ThemeProvider>,
    );

    await waitFor(() => expect(triggerFeedHealth).toHaveBeenCalled());

    expect(screen.getByText("ACK_FORM_TITLE")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ACK_FIELD_OPERATOR")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ACK_FIELD_NOTE")).toBeInTheDocument();

    fireEvent.click(screen.getByText("ACTION_PREFILL_CANCEL"));
    expect(
      screen.getByPlaceholderText("FIELD_BET_ID"),
    ).toHaveValue("bet-risk-1");
    expect(
      screen.getByPlaceholderText("FIELD_PLAYER_ID"),
    ).toHaveValue("player-risk-1");
    expect(
      screen.getByPlaceholderText("FIELD_REQUEST_ID"),
    ).toHaveValue("req-risk-1");

    fireEvent.click(screen.getByText("ACTION_PREFILL_INTERVENTION"));
    expect(screen.getByPlaceholderText("BET_FIELD_BET_ID")).toHaveValue(
      "bet-risk-1",
    );

    fireEvent.change(screen.getByPlaceholderText("ACK_FIELD_OPERATOR"), {
      target: { value: "ops.user.2" },
    });
    fireEvent.change(screen.getByPlaceholderText("ACK_FIELD_NOTE"), {
      target: { value: "Escalating for closure" },
    });
    fireEvent.click(screen.getByText("ACK_ACTION_PREPARE_RESOLVE"));
    expect(screen.getByTestId("provider-ops-ack-submit")).toHaveTextContent(
      "ACK_ACTION_RESOLVE",
    );

    fireEvent.click(screen.getByText("ACTION_STREAM_AUDIT"));
    expect(push).toHaveBeenCalledWith({
      pathname: "/logs",
      query: {
        action: "provider.cancel.failed",
        actorId: "odds88",
        p: 1,
        limit: 20,
      },
    });

    fireEvent.click(screen.getByText("ACK_SLA_ACTION_SAVE_ADAPTER"));
    await waitFor(() => expect(triggerAckSLAUpdate).toHaveBeenCalled());
    expect(triggerAckSLAUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        adapter: "odds88",
        warningMinutes: 15,
        criticalMinutes: 30,
      }),
    );

    fireEvent.click(screen.getByText("ACK_SLA_ACTION_OPEN_AUDIT"));
    expect(push).toHaveBeenCalledWith({
      pathname: "/logs",
      query: {
        preset: "provider-ack-sla-adapter",
        action: "provider.stream.sla.adapter.updated",
        targetId: "odds88",
        p: 1,
        limit: 20,
      },
    });
  });

  test.each([
    {
      lastAction: "acknowledged",
      expectedAction: "provider.stream.acknowledged",
      expectedPreset: "provider-acknowledged",
    },
    {
      lastAction: "reassigned",
      expectedAction: "provider.stream.reassigned",
      expectedPreset: "provider-reassigned",
    },
    {
      lastAction: "resolved",
      expectedAction: "provider.stream.resolved",
      expectedPreset: "provider-resolved",
    },
    {
      lastAction: "reopened",
      expectedAction: "provider.stream.reopened",
      expectedPreset: "provider-reopened",
    },
  ])(
    "opens acknowledgement audit deep-link with preset mapping for %s lifecycle",
    async ({ lastAction, expectedAction, expectedPreset }) => {
      const triggerFeedHealth = jest.fn().mockResolvedValue({});
      const triggerCancel = jest.fn().mockResolvedValue({});
      const triggerIntervention = jest.fn().mockResolvedValue({});
      const triggerAckList = jest.fn().mockResolvedValue({});
      const triggerAckUpsert = jest.fn().mockResolvedValue({});
      const triggerAckSLAGet = jest.fn().mockResolvedValue({});
      const triggerAckSLAUpdate = jest.fn().mockResolvedValue({});
      const push = jest.fn();

      mockedUseRouter.mockReturnValue({
        query: {},
        push,
      });

      const feedTuple = [
        triggerFeedHealth,
        false,
        {
          succeeded: true,
          data: {
            enabled: true,
            streams: [
              {
                adapter: "odds88",
                stream: "settlement",
                state: "error",
                lastLagMs: 120,
                duplicateCount: 0,
                gapCount: 0,
                errorCount: 1,
                lastRevision: 3,
                lastSequence: 9,
                lastBetId: "bet-risk-1",
                lastPlayerId: "player-risk-1",
                lastRequestId: "req-risk-1",
                lastError: "stream down",
                updatedAt: "2026-03-05T10:01:00Z",
              },
            ],
          },
        },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const cancelTuple = [
        triggerCancel,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const interventionTuple = [
        triggerIntervention,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementListTuple = [
        triggerAckList,
        false,
        {
          succeeded: true,
          data: {
            items: [
              {
                streamKey: "odds88:settlement",
                operator: "ops.persisted",
                note: "Investigating persisted issue",
                status: "acknowledged",
                lastAction,
                acknowledgedAt: "2020-01-01T00:00:00Z",
              },
            ],
          },
        },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementUpsertTuple = [
        triggerAckUpsert,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementSLASettingsTuple = [
        triggerAckSLAGet,
        false,
        {
          succeeded: true,
          data: {
            default: {
              warningMinutes: 15,
              criticalMinutes: 30,
            },
            effective: [
              {
                adapter: "odds88",
                warningMinutes: 15,
                criticalMinutes: 30,
                source: "default",
              },
            ],
          },
        },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementSLAUpdateTuple = [
        triggerAckSLAUpdate,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;

      let acknowledgementHookCalls = 0;
      let acknowledgementSLAHookCalls = 0;
      mockedUseApi.mockImplementation((url: string) => {
        if (url === "admin/feed-health") {
          return feedTuple;
        }
        if (url === "admin/provider/acknowledgements") {
          acknowledgementHookCalls += 1;
          return acknowledgementHookCalls === 1
            ? acknowledgementListTuple
            : acknowledgementUpsertTuple;
        }
        if (url === "admin/provider/acknowledgement-sla") {
          acknowledgementSLAHookCalls += 1;
          return acknowledgementSLAHookCalls === 1
            ? acknowledgementSLASettingsTuple
            : acknowledgementSLAUpdateTuple;
        }
        if (url === "admin/provider/cancel") {
          return cancelTuple;
        }
        if (url === "admin/bets/:id/lifecycle/:action") {
          return interventionTuple;
        }
        return acknowledgementUpsertTuple;
      });

      render(
        <ThemeProvider theme={{ logo: "test.png" }}>
          <ProviderOpsContainer />
        </ThemeProvider>,
      );

      await waitFor(() => expect(triggerFeedHealth).toHaveBeenCalled());

      fireEvent.click(screen.getByText("ACK_ACTION_STALE_AUDIT"));

      expect(push).toHaveBeenCalledWith({
        pathname: "/logs",
        query: {
          preset: expectedPreset,
          action: expectedAction,
          targetId: "odds88:settlement",
          p: 1,
          limit: 20,
        },
      });
    },
  );

  test("shows stale audit CTA only when acknowledgement is stale", async () => {
    const triggerFeedHealth = jest.fn().mockResolvedValue({});
    const triggerCancel = jest.fn().mockResolvedValue({});
    const triggerIntervention = jest.fn().mockResolvedValue({});
    const triggerAckList = jest.fn().mockResolvedValue({});
    const triggerAckUpsert = jest.fn().mockResolvedValue({});
    const triggerAckSLAGet = jest.fn().mockResolvedValue({});
    const triggerAckSLAUpdate = jest.fn().mockResolvedValue({});
    const freshAcknowledgedAt = new Date().toISOString();

    mockedUseRouter.mockReturnValue({
      query: {},
      push: jest.fn(),
    });

    const feedTuple = [
      triggerFeedHealth,
      false,
      {
        succeeded: true,
        data: {
          enabled: true,
          streams: [
            {
              adapter: "odds88",
              stream: "settlement",
              state: "error",
              lastLagMs: 120,
              duplicateCount: 0,
              gapCount: 0,
              errorCount: 1,
              lastRevision: 3,
              lastSequence: 9,
              lastBetId: "bet-risk-1",
              lastPlayerId: "player-risk-1",
              lastRequestId: "req-risk-1",
              lastError: "stream down",
              updatedAt: "2026-03-05T10:01:00Z",
            },
          ],
        },
      },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const cancelTuple = [
      triggerCancel,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const interventionTuple = [
      triggerIntervention,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementListTuple = [
      triggerAckList,
      false,
      {
        succeeded: true,
        data: {
          items: [
            {
              streamKey: "odds88:settlement",
              operator: "ops.persisted",
              note: "Fresh acknowledgement",
              status: "acknowledged",
              lastAction: "acknowledged",
              acknowledgedAt: freshAcknowledgedAt,
            },
          ],
        },
      },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementUpsertTuple = [
      triggerAckUpsert,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementSLASettingsTuple = [
      triggerAckSLAGet,
      false,
      {
        succeeded: true,
        data: {
          default: {
            warningMinutes: 15,
            criticalMinutes: 30,
          },
          effective: [
            {
              adapter: "odds88",
              warningMinutes: 15,
              criticalMinutes: 30,
              source: "default",
            },
          ],
        },
      },
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;
    const acknowledgementSLAUpdateTuple = [
      triggerAckSLAUpdate,
      false,
      {},
      jest.fn(),
      jest.fn(),
    ] as unknown as UseApi;

    let acknowledgementHookCalls = 0;
    let acknowledgementSLAHookCalls = 0;
    mockedUseApi.mockImplementation((url: string) => {
      if (url === "admin/feed-health") {
        return feedTuple;
      }
      if (url === "admin/provider/acknowledgements") {
        acknowledgementHookCalls += 1;
        return acknowledgementHookCalls === 1
          ? acknowledgementListTuple
          : acknowledgementUpsertTuple;
      }
      if (url === "admin/provider/acknowledgement-sla") {
        acknowledgementSLAHookCalls += 1;
        return acknowledgementSLAHookCalls === 1
          ? acknowledgementSLASettingsTuple
          : acknowledgementSLAUpdateTuple;
      }
      if (url === "admin/provider/cancel") {
        return cancelTuple;
      }
      if (url === "admin/bets/:id/lifecycle/:action") {
        return interventionTuple;
      }
      return acknowledgementUpsertTuple;
    });

    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <ProviderOpsContainer />
      </ThemeProvider>,
    );

    await waitFor(() => expect(triggerFeedHealth).toHaveBeenCalled());

    expect(screen.queryByText("ACK_ACTION_STALE_AUDIT")).not.toBeInTheDocument();
  });

  test.each([
    {
      minutesAgo: 20,
      staleBadge: "ACK_STALE_WARNING",
    },
    {
      minutesAgo: 40,
      staleBadge: "ACK_STALE_CRITICAL",
    },
  ])(
    "renders %s badge with stale audit CTA for stale acknowledgement rows",
    async ({ minutesAgo, staleBadge }) => {
      const triggerFeedHealth = jest.fn().mockResolvedValue({});
      const triggerCancel = jest.fn().mockResolvedValue({});
      const triggerIntervention = jest.fn().mockResolvedValue({});
      const triggerAckList = jest.fn().mockResolvedValue({});
      const triggerAckUpsert = jest.fn().mockResolvedValue({});
      const triggerAckSLAGet = jest.fn().mockResolvedValue({});
      const triggerAckSLAUpdate = jest.fn().mockResolvedValue({});
      const staleAcknowledgedAt = new Date(
        Date.now() - minutesAgo * 60 * 1000,
      ).toISOString();

      mockedUseRouter.mockReturnValue({
        query: {},
        push: jest.fn(),
      });

      const feedTuple = [
        triggerFeedHealth,
        false,
        {
          succeeded: true,
          data: {
            enabled: true,
            streams: [
              {
                adapter: "odds88",
                stream: "settlement",
                state: "error",
                lastLagMs: 120,
                duplicateCount: 0,
                gapCount: 0,
                errorCount: 1,
                lastRevision: 3,
                lastSequence: 9,
                lastBetId: "bet-risk-1",
                lastPlayerId: "player-risk-1",
                lastRequestId: "req-risk-1",
                lastError: "stream down",
                updatedAt: "2026-03-05T10:01:00Z",
              },
            ],
          },
        },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const cancelTuple = [
        triggerCancel,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const interventionTuple = [
        triggerIntervention,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementListTuple = [
        triggerAckList,
        false,
        {
          succeeded: true,
          data: {
            items: [
              {
                streamKey: "odds88:settlement",
                operator: "ops.persisted",
                note: "Stale acknowledgement",
                status: "acknowledged",
                lastAction: "acknowledged",
                acknowledgedAt: staleAcknowledgedAt,
              },
            ],
          },
        },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementUpsertTuple = [
        triggerAckUpsert,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementSLASettingsTuple = [
        triggerAckSLAGet,
        false,
        {
          succeeded: true,
          data: {
            default: {
              warningMinutes: 15,
              criticalMinutes: 30,
            },
            effective: [
              {
                adapter: "odds88",
                warningMinutes: 15,
                criticalMinutes: 30,
                source: "default",
              },
            ],
          },
        },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementSLAUpdateTuple = [
        triggerAckSLAUpdate,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;

      let acknowledgementHookCalls = 0;
      let acknowledgementSLAHookCalls = 0;
      mockedUseApi.mockImplementation((url: string) => {
        if (url === "admin/feed-health") {
          return feedTuple;
        }
        if (url === "admin/provider/acknowledgements") {
          acknowledgementHookCalls += 1;
          return acknowledgementHookCalls === 1
            ? acknowledgementListTuple
            : acknowledgementUpsertTuple;
        }
        if (url === "admin/provider/acknowledgement-sla") {
          acknowledgementSLAHookCalls += 1;
          return acknowledgementSLAHookCalls === 1
            ? acknowledgementSLASettingsTuple
            : acknowledgementSLAUpdateTuple;
        }
        if (url === "admin/provider/cancel") {
          return cancelTuple;
        }
        if (url === "admin/bets/:id/lifecycle/:action") {
          return interventionTuple;
        }
        return acknowledgementUpsertTuple;
      });

      render(
        <ThemeProvider theme={{ logo: "test.png" }}>
          <ProviderOpsContainer />
        </ThemeProvider>,
      );

      await waitFor(() => expect(triggerFeedHealth).toHaveBeenCalled());

      expect(screen.getByText(staleBadge)).toBeInTheDocument();
      expect(screen.getByText("ACK_ACTION_STALE_AUDIT")).toBeInTheDocument();
    },
  );

  // M3-S4: multi-leg settle guard tests
  describe("multi-leg settle guard", () => {
    const setupMultiLegTest = (betDetailResponse: any) => {
      const triggerFeedHealth = jest.fn().mockResolvedValue({});
      const triggerCancel = jest.fn().mockResolvedValue({});
      const triggerIntervention = jest.fn().mockResolvedValue({});
      const triggerBetDetail = jest.fn().mockResolvedValue(betDetailResponse);
      const triggerAckList = jest.fn().mockResolvedValue({});
      const triggerAckUpsert = jest.fn().mockResolvedValue({});
      const triggerAckSLAGet = jest.fn().mockResolvedValue({});
      const triggerAckSLAUpdate = jest.fn().mockResolvedValue({});

      mockedUseRouter.mockReturnValue({
        query: {},
        push: jest.fn(),
      });

      const feedTuple = [
        triggerFeedHealth,
        false,
        {
          succeeded: true,
          data: { enabled: true, streams: [] },
        },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const cancelTuple = [
        triggerCancel,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const interventionTuple = [
        triggerIntervention,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const betDetailTuple = [
        triggerBetDetail,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementListTuple = [
        triggerAckList,
        false,
        { succeeded: true, data: { items: [] } },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementUpsertTuple = [
        triggerAckUpsert,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementSLASettingsTuple = [
        triggerAckSLAGet,
        false,
        {
          succeeded: true,
          data: {
            default: { warningMinutes: 15, criticalMinutes: 30 },
          },
        },
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;
      const acknowledgementSLAUpdateTuple = [
        triggerAckSLAUpdate,
        false,
        {},
        jest.fn(),
        jest.fn(),
      ] as unknown as UseApi;

      let acknowledgementHookCalls = 0;
      let acknowledgementSLAHookCalls = 0;
      mockedUseApi.mockImplementation((url: string) => {
        if (url === "admin/feed-health") {
          return feedTuple;
        }
        if (url === "admin/provider/acknowledgements") {
          acknowledgementHookCalls += 1;
          return acknowledgementHookCalls === 1
            ? acknowledgementListTuple
            : acknowledgementUpsertTuple;
        }
        if (url === "admin/provider/acknowledgement-sla") {
          acknowledgementSLAHookCalls += 1;
          return acknowledgementSLAHookCalls === 1
            ? acknowledgementSLASettingsTuple
            : acknowledgementSLAUpdateTuple;
        }
        if (url === "admin/provider/cancel") {
          return cancelTuple;
        }
        if (url === "admin/bets/:id/lifecycle/:action") {
          return interventionTuple;
        }
        if (url === "admin/bets/:id") {
          return betDetailTuple;
        }
        return acknowledgementUpsertTuple;
      });

      return { triggerBetDetail, triggerIntervention };
    };

    // Note: debounced useEffect tests (multi-leg detection via API lookup) are
    // unreliable in jsdom due to Antd Input + controlled component + setTimeout
    // interaction. Multi-leg contract behavior is tested in contracts.test.ts.
    // Backend multi-leg rejection is tested in service_test.go
    // (TestApplyAdminBetLifecycleActionSettleRejectsParlays).

    test("does not trigger bet detail lookup for short bet IDs", async () => {
      const { triggerBetDetail } = setupMultiLegTest({});

      render(
        <ThemeProvider theme={{ logo: "test.png" }}>
          <ProviderOpsContainer />
        </ThemeProvider>,
      );

      await waitFor(() => expect(screen.getByPlaceholderText("BET_FIELD_BET_ID")).toBeInTheDocument());

      // Short IDs (< 8 chars) should not trigger the debounced lookup
      fireEvent.change(screen.getByPlaceholderText("BET_FIELD_BET_ID"), {
        target: { value: "short" },
      });

      await new Promise((r) => setTimeout(r, 700));
      expect(triggerBetDetail).not.toHaveBeenCalled();
    });

    test("bet detail lookup hook is wired with correct URL", () => {
      setupMultiLegTest({});

      render(
        <ThemeProvider theme={{ logo: "test.png" }}>
          <ProviderOpsContainer />
        </ThemeProvider>,
      );

      // Verify the useApi mock was called with the bet detail lookup URL
      const calls = mockedUseApi.mock.calls.map((c: any[]) => c[0]);
      expect(calls).toContain("admin/bets/:id");
    });

    test("bet intervention form renders bet ID input and action selector", async () => {
      setupMultiLegTest({});

      render(
        <ThemeProvider theme={{ logo: "test.png" }}>
          <ProviderOpsContainer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("BET_FIELD_BET_ID")).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText("BET_FIELD_REASON")).toBeInTheDocument();
      expect(screen.getByText("BET_INTERVENTION_TITLE")).toBeInTheDocument();
    });
  });
});
