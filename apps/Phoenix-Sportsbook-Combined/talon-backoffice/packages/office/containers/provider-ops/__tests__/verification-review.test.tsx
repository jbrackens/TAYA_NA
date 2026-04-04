import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import VerificationReviewPanel from "../verification-review";
import { useApi, UseApi } from "../../../services/api/api-service";

jest.mock("../../../services/api/api-service");
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

const buildMockTuple = (
  trigger: jest.Mock,
  loading: boolean,
  response: Record<string, any>,
): UseApi =>
  [trigger, loading, response, jest.fn(), jest.fn()] as unknown as UseApi;

describe("VerificationReviewPanel — decision flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupHooks = () => {
    const triggerQueue = jest.fn().mockResolvedValue({});
    const triggerDetail = jest.fn().mockResolvedValue({});
    const triggerEvents = jest.fn().mockResolvedValue({});
    const triggerAssign = jest.fn().mockResolvedValue({});
    const triggerNote = jest.fn().mockResolvedValue({});
    const triggerDecision = jest.fn().mockResolvedValue({});

    const queueResponse = {
      succeeded: true,
      data: {
        data: [
          {
            id: "session-1",
            userId: "user-42",
            flowType: "idpv",
            provider: "idcomply",
            status: "pending_review",
            createdAt: "2026-03-10T10:00:00Z",
            updatedAt: "2026-03-10T10:05:00Z",
          },
        ],
      },
    };
    const detailResponse = {
      succeeded: true,
      data: {
        id: "session-1",
        userId: "user-42",
        flowType: "idpv",
        provider: "idcomply",
        status: "pending_review",
        createdAt: "2026-03-10T10:00:00Z",
        updatedAt: "2026-03-10T10:05:00Z",
      },
    };
    const eventsResponse = {
      succeeded: true,
      data: { data: [] },
    };

    mockedUseApi.mockImplementation((url: string) => {
      if (
        url ===
        "admin/providers/idcomply/verification-sessions/review-queue"
      ) {
        return buildMockTuple(triggerQueue, false, queueResponse);
      }
      if (url === "admin/users/verification-sessions/:sessionID") {
        return buildMockTuple(triggerDetail, false, detailResponse);
      }
      if (url === "admin/users/verification-sessions/:sessionID/events") {
        return buildMockTuple(triggerEvents, false, eventsResponse);
      }
      if (url === "admin/users/verification-sessions/:sessionID/assign") {
        return buildMockTuple(triggerAssign, false, {});
      }
      if (url === "admin/users/verification-sessions/:sessionID/notes") {
        return buildMockTuple(triggerNote, false, {});
      }
      if (url === "admin/users/verification-sessions/:sessionID/decision") {
        return buildMockTuple(triggerDecision, false, {});
      }
      return buildMockTuple(jest.fn(), false, {});
    });

    return {
      triggerQueue,
      triggerDetail,
      triggerEvents,
      triggerAssign,
      triggerNote,
      triggerDecision,
    };
  };

  test("renders decision card with decision options in the session drawer", async () => {
    const { triggerQueue } = setupHooks();

    render(<VerificationReviewPanel />);

    await waitFor(() => expect(triggerQueue).toHaveBeenCalled());

    fireEvent.click(screen.getByText("VERIFICATION_ACTION_OPEN"));

    await waitFor(() => {
      expect(
        screen.getByText("VERIFICATION_DECISION_TITLE"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("VERIFICATION_DECISION_SUBMIT"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("VERIFICATION_DECISION_REASON_PLACEHOLDER"),
    ).toBeInTheDocument();
  });

  test("submits approved decision with reason via the admin decision route", async () => {
    const { triggerQueue, triggerDecision } = setupHooks();

    render(<VerificationReviewPanel />);

    await waitFor(() => expect(triggerQueue).toHaveBeenCalled());

    fireEvent.click(screen.getByText("VERIFICATION_ACTION_OPEN"));

    await waitFor(() => {
      expect(
        screen.getByText("VERIFICATION_DECISION_TITLE"),
      ).toBeInTheDocument();
    });

    // Open the Select dropdown and pick "approved"
    fireEvent.mouseDown(
      screen.getByText("VERIFICATION_DECISION_PLACEHOLDER"),
    );
    await waitFor(() => {
      expect(
        screen.getByText("VERIFICATION_DECISION_APPROVED"),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("VERIFICATION_DECISION_APPROVED"));

    fireEvent.change(
      screen.getByPlaceholderText(
        "VERIFICATION_DECISION_REASON_PLACEHOLDER",
      ),
      { target: { value: "Documents look good" } },
    );

    fireEvent.click(screen.getByTestId("verification-decision-submit"));

    await waitFor(() => {
      expect(triggerDecision).toHaveBeenCalledWith(
        {
          decision: "approved",
          reason: "Documents look good",
        },
        { sessionID: "session-1" },
      );
    });
  });

  test("submits rejected decision without reason", async () => {
    const { triggerQueue, triggerDecision } = setupHooks();

    render(<VerificationReviewPanel />);

    await waitFor(() => expect(triggerQueue).toHaveBeenCalled());
    fireEvent.click(screen.getByText("VERIFICATION_ACTION_OPEN"));

    await waitFor(() => {
      expect(
        screen.getByText("VERIFICATION_DECISION_TITLE"),
      ).toBeInTheDocument();
    });

    fireEvent.mouseDown(
      screen.getByText("VERIFICATION_DECISION_PLACEHOLDER"),
    );
    await waitFor(() => {
      expect(
        screen.getByText("VERIFICATION_DECISION_REJECTED"),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("VERIFICATION_DECISION_REJECTED"));

    fireEvent.click(screen.getByTestId("verification-decision-submit"));

    await waitFor(() => {
      expect(triggerDecision).toHaveBeenCalledWith(
        { decision: "rejected" },
        { sessionID: "session-1" },
      );
    });
  });

  test("submit button is disabled until a decision is selected", async () => {
    const { triggerQueue } = setupHooks();

    render(<VerificationReviewPanel />);

    await waitFor(() => expect(triggerQueue).toHaveBeenCalled());
    fireEvent.click(screen.getByText("VERIFICATION_ACTION_OPEN"));

    await waitFor(() => {
      expect(
        screen.getByTestId("verification-decision-submit"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("verification-decision-submit")).toBeDisabled();
  });

  test("uses the admin decision route, not the provider route", async () => {
    setupHooks();

    const hookUrls: string[] = [];
    mockedUseApi.mockImplementation((url: string) => {
      hookUrls.push(url);
      return buildMockTuple(jest.fn().mockResolvedValue({}), false, {});
    });

    render(<VerificationReviewPanel />);

    expect(hookUrls).toContain(
      "admin/users/verification-sessions/:sessionID/decision",
    );
    expect(hookUrls).not.toContain(
      "admin/providers/idcomply/verification-sessions/:sessionID/decision",
    );
  });
});
