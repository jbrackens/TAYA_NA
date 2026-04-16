import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRouter } from "next/router";
import { useApi, UseApi } from "../../../services/api/api-service";
import AuditLogsContainer from "..";
import { SCOPED_COPY_EVENT_DETAIL_KEYS } from "../../../lib/telemetry/scoped-copy-events";
import { createScopedCopyEventDetail } from "../../../lib/telemetry/test-fixtures/scoped-copy-event-detail";
import {
  resolveScopedQueryKeyCount,
  resolveScopedQueryKeySignature,
  resolveScopedUrlLengthBucket,
} from "../utils/scoped-copy-telemetry";

jest.mock("../../../services/api/api-service");
jest.mock("next/router");

const mockDispatch = jest.fn();
const mockState = {
  logs: {
    data: [],
    pagination: {},
    paginationResponse: {},
    filters: {},
    sorting: {},
  },
};

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => mockDispatch,
  useSelector: (selector: Function) => selector(mockState),
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
const mockedUseRouter = useRouter as jest.Mock;
const scopedCopyEventDetailKeys = Object.keys(
  createScopedCopyEventDetail(),
).sort();

const expectScopedCopyDetailKeyParity = (
  detail: Record<string, unknown> | undefined,
): void => {
  expect([...SCOPED_COPY_EVENT_DETAIL_KEYS].sort()).toEqual(
    scopedCopyEventDetailKeys,
  );
  expect(detail).toBeDefined();
  expect(Object.keys(detail || {}).sort()).toEqual(
    scopedCopyEventDetailKeys,
  );
};

describe("AuditLogsContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("includes promo filters in audit log api query", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    mockedUseRouter.mockReturnValue({
      query: {
        action: "bet.placed",
        actorId: "admin-1",
        targetId: "odds88:settlement",
        userId: "u-100",
        freebetId: "fb-77",
        oddsBoostId: "ob-42",
        p: "2",
        limit: "50",
      },
      push: jest.fn(),
    });

    render(<AuditLogsContainer />);

    expect(screen.getAllByText("HEADER_TARGET")).toHaveLength(1);
    expect(screen.getAllByText("HEADER_USER")).toHaveLength(1);

    await waitFor(() =>
      expect(triggerApi).toHaveBeenCalledWith(undefined, {
        query: {
          action: "bet.placed",
          actor_id: "admin-1",
          target_id: "odds88:settlement",
          page: 2,
          limit: 50,
          sort_by: "created_at",
          sort_dir: "desc",
        },
      }),
    );
  });

  test("hydrates api query from preset when explicit action/target are absent", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    mockedUseRouter.mockReturnValue({
      query: {
        preset: "provider-ack-sla-default",
        p: "1",
        limit: "20",
      },
      push: jest.fn(),
    });

    render(<AuditLogsContainer />);

    await waitFor(() =>
      expect(triggerApi).toHaveBeenCalledWith(undefined, {
        query: {
          action: "provider.stream.sla.default.updated",
          target_id: "provider.stream.sla.default",
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_dir: "desc",
        },
      }),
    );
  });

  test("applies filter form values into router query", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const push = jest.fn();
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    mockedUseRouter.mockReturnValue({
      query: {
        p: "1",
        limit: "20",
      },
      push,
    });

    render(<AuditLogsContainer />);

    fireEvent.change(screen.getByPlaceholderText("FILTER_ACTION_PLACEHOLDER"), {
      target: { value: "bet.placed" },
    });
    const targetInput = screen.getByPlaceholderText(
      "FILTER_TARGET_PLACEHOLDER",
    ) as HTMLInputElement;
    fireEvent.change(targetInput, {
      target: { value: "odds88:settlement" },
    });
    await waitFor(() => expect(targetInput.value).toBe("odds88:settlement"));

    fireEvent.click(screen.getByText("FILTER_APPLY"));

    expect(push).toHaveBeenCalledWith(
      {
        query: {
          action: "bet.placed",
          targetId: "odds88:settlement",
          p: 1,
          limit: 20,
        },
      },
      undefined,
      { shallow: true },
    );
  });

  test("applies provider-ops preset filters into router query", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const push = jest.fn();
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    mockedUseRouter.mockReturnValue({
      query: {
        p: "1",
        limit: "20",
      },
      push,
    });

    render(<AuditLogsContainer />);

    fireEvent.click(screen.getByText("FILTER_PRESET_PROVIDER_ACK_SLA_DEFAULT"));

    expect(push).toHaveBeenCalledWith(
      {
        query: {
          preset: "provider-ack-sla-default",
          action: "provider.stream.sla.default.updated",
          targetId: "provider.stream.sla.default",
          p: 1,
          limit: 20,
        },
      },
      undefined,
      { shallow: true },
    );
  });

  test("shows active preset context and clears inherited preset filters", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const push = jest.fn();
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    mockedUseRouter.mockReturnValue({
      query: {
        preset: "provider-ack-sla-default",
        p: "1",
        limit: "20",
      },
      push,
    });

    render(<AuditLogsContainer />);

    expect(
      screen.getByText(
        "FILTER_PRESET_ACTIVE_LABEL FILTER_PRESET_PROVIDER_ACK_SLA_DEFAULT",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("FILTER_PRESET_CLEAR"));

    expect(push).toHaveBeenCalledWith(
      {
        query: {
          p: 1,
          limit: 20,
        },
      },
      undefined,
      { shallow: true },
    );
  });

  test("copies preset-aware scoped audit URL for incident handoff", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const push = jest.fn();
    const writeText = jest.fn().mockResolvedValue(undefined);
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    mockedUseRouter.mockReturnValue({
      query: {
        preset: "provider-ack-sla-default",
        p: "1",
        limit: "20",
      },
      pathname: "/logs",
      push,
    });

    render(<AuditLogsContainer />);

    fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL"));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedUrl = (writeText as jest.Mock).mock.calls[0][0] as string;
    expect(copiedUrl).toContain("/logs?");
    expect(copiedUrl).toContain("preset=provider-ack-sla-default");
    expect(copiedUrl).toContain("p=1");
    expect(copiedUrl).toContain("limit=20");
    const emittedEvents = dispatchSpy.mock.calls.map(
      ([event]) => (event as CustomEvent).detail?.event,
    );
    expect(emittedEvents).toContain("copy_success");
    const copyEvent = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .find((event) => event.detail?.event === "copy_success");
    expectScopedCopyDetailKeyParity(copyEvent?.detail as Record<string, unknown>);
    expect(copyEvent?.detail?.copyMode).toBe("clipboard");
    expect(copyEvent?.detail?.isPresetActive).toBe(true);
    expect(copyEvent?.detail?.canOpenScopedUrl).toBe(true);
    expect(copyEvent?.detail?.copyButtonLabel).toBe("copy");
    expect(copyEvent?.detail?.scopedUrlLengthBucket).toBe(
      resolveScopedUrlLengthBucket(copiedUrl),
    );
    expect(copyEvent?.detail?.scopedQueryKeyCount).toBe(
      resolveScopedQueryKeyCount(copiedUrl),
    );
    expect(copyEvent?.detail?.scopedQueryKeySignature).toBe(
      resolveScopedQueryKeySignature(copiedUrl),
    );
    expect(copyEvent?.detail?.explicitOverrideCount).toBe(0);
    expect(copyEvent?.detail?.explicitOverrideKeySignature).toBe("none");
    expect(copyEvent?.detail?.appliedFilterKeySignature).toBe(
      "action|targetId",
    );
    expect(copyEvent?.detail?.hasTargetId).toBe(true);
    expect(copyEvent?.detail?.hasActionOverride).toBe(false);
    expect(copyEvent?.detail?.nonEmptyFilterCount).toBe(2);
    expect(copyEvent?.detail?.page).toBe(1);
    expect(copyEvent?.detail?.pageSize).toBe(20);
    dispatchSpy.mockRestore();
  });

  test("copies scoped URL with explicit override filters when preset is active", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const push = jest.fn();
    const writeText = jest.fn().mockResolvedValue(undefined);
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    mockedUseRouter.mockReturnValue({
      query: {
        preset: "provider-ack-sla-default",
        action: "provider.stream.reassigned",
        targetId: "odds88:settlement",
        p: "1",
        limit: "20",
      },
      pathname: "/logs",
      push,
    });

    render(<AuditLogsContainer />);

    fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL"));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedUrl = (writeText as jest.Mock).mock.calls[0][0] as string;
    expect(copiedUrl).toContain("/logs?");
    expect(copiedUrl).toContain("preset=provider-ack-sla-default");
    expect(copiedUrl).toContain("action=provider.stream.reassigned");
    expect(copiedUrl).toContain("targetId=odds88%3Asettlement");
    const copyEvent = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .find((event) => event.detail?.event === "copy_success");
    expectScopedCopyDetailKeyParity(copyEvent?.detail as Record<string, unknown>);
    expect(copyEvent?.detail?.copyMode).toBe("clipboard");
    expect(copyEvent?.detail?.isPresetActive).toBe(true);
    expect(copyEvent?.detail?.canOpenScopedUrl).toBe(true);
    expect(copyEvent?.detail?.copyButtonLabel).toBe("copy");
    expect(copyEvent?.detail?.scopedUrlLengthBucket).toBe(
      resolveScopedUrlLengthBucket(copiedUrl),
    );
    expect(copyEvent?.detail?.scopedQueryKeyCount).toBe(
      resolveScopedQueryKeyCount(copiedUrl),
    );
    expect(copyEvent?.detail?.scopedQueryKeySignature).toBe(
      resolveScopedQueryKeySignature(copiedUrl),
    );
    expect(copyEvent?.detail?.explicitOverrideCount).toBe(2);
    expect(copyEvent?.detail?.explicitOverrideKeySignature).toBe(
      "action|targetId",
    );
    expect(copyEvent?.detail?.appliedFilterKeySignature).toBe(
      "action|targetId",
    );
    expect(copyEvent?.detail?.hasTargetId).toBe(true);
    expect(copyEvent?.detail?.hasActionOverride).toBe(true);
    expect(copyEvent?.detail?.nonEmptyFilterCount).toBe(2);
    expect(copyEvent?.detail?.page).toBe(1);
    expect(copyEvent?.detail?.pageSize).toBe(20);
    dispatchSpy.mockRestore();
  });

  test("shows manual-copy fallback when clipboard API is unavailable", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    mockedUseRouter.mockReturnValue({
      query: {
        preset: "provider-ack-sla-default",
        p: "1",
        limit: "20",
      },
      pathname: "/logs",
      push: jest.fn(),
    });

    const view = render(<AuditLogsContainer />);

    fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL"));

    expect(
      screen.getByText("FILTER_PRESET_COPY_URL_FALLBACK_MESSAGE"),
    ).toBeInTheDocument();
    const fallbackInput = screen.getByTestId(
      "audit-scoped-url-fallback",
    ) as HTMLInputElement;
    expect(fallbackInput.value).toContain("/logs?");
    expect(fallbackInput.value).toContain("preset=provider-ack-sla-default");
    await waitFor(() => expect(document.activeElement).toBe(fallbackInput));
    expect(fallbackInput.selectionStart).toBe(0);
    expect(fallbackInput.selectionEnd).toBe(fallbackInput.value.length);
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
    fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL_OPEN"));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("/logs?"),
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
    const emittedEvents = dispatchSpy.mock.calls.map(
      ([event]) => (event as CustomEvent).detail?.event,
    );
    expect(emittedEvents).toContain("fallback_unavailable");
    expect(emittedEvents).toContain("open_action");
    const fallbackEvent = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .find((event) => event.detail?.event === "fallback_unavailable");
    const openEvent = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .find((event) => event.detail?.event === "open_action");
    expectScopedCopyDetailKeyParity(
      fallbackEvent?.detail as Record<string, unknown>,
    );
    expectScopedCopyDetailKeyParity(openEvent?.detail as Record<string, unknown>);
    expect(fallbackEvent?.detail?.copyMode).toBe("manualFallback");
    expect(fallbackEvent?.detail?.isPresetActive).toBe(true);
    expect(fallbackEvent?.detail?.canOpenScopedUrl).toBe(true);
    expect(fallbackEvent?.detail?.copyButtonLabel).toBe("copy");
    expect(fallbackEvent?.detail?.scopedUrlLengthBucket).toBe(
      resolveScopedUrlLengthBucket(fallbackInput.value),
    );
    expect(fallbackEvent?.detail?.scopedQueryKeyCount).toBe(
      resolveScopedQueryKeyCount(fallbackInput.value),
    );
    expect(fallbackEvent?.detail?.scopedQueryKeySignature).toBe(
      resolveScopedQueryKeySignature(fallbackInput.value),
    );
    expect(fallbackEvent?.detail?.explicitOverrideCount).toBe(0);
    expect(fallbackEvent?.detail?.explicitOverrideKeySignature).toBe("none");
    expect(fallbackEvent?.detail?.appliedFilterKeySignature).toBe(
      "action|targetId",
    );
    expect(fallbackEvent?.detail?.nonEmptyFilterCount).toBe(2);
    expect(openEvent?.detail?.copyMode).toBe("manualFallback");
    expect(openEvent?.detail?.isPresetActive).toBe(true);
    expect(openEvent?.detail?.canOpenScopedUrl).toBe(true);
    expect(openEvent?.detail?.copyButtonLabel).toBe("retry");
    expect(openEvent?.detail?.scopedUrlLengthBucket).toBe(
      resolveScopedUrlLengthBucket(fallbackInput.value),
    );
    expect(openEvent?.detail?.scopedQueryKeyCount).toBe(
      resolveScopedQueryKeyCount(fallbackInput.value),
    );
    expect(openEvent?.detail?.scopedQueryKeySignature).toBe(
      resolveScopedQueryKeySignature(fallbackInput.value),
    );
    expect(openEvent?.detail?.explicitOverrideCount).toBe(0);
    expect(openEvent?.detail?.explicitOverrideKeySignature).toBe("none");
    expect(openEvent?.detail?.appliedFilterKeySignature).toBe(
      "action|targetId",
    );
    expect(openEvent?.detail?.nonEmptyFilterCount).toBe(2);
    dispatchSpy.mockRestore();

    mockedUseRouter.mockReturnValue({
      query: {
        preset: "provider-reassigned",
        action: "provider.stream.reassigned",
        p: "1",
        limit: "20",
      },
      pathname: "/logs",
      push: jest.fn(),
    });
    view.rerender(<AuditLogsContainer />);

    await waitFor(() =>
      expect(
        screen.queryByText("FILTER_PRESET_COPY_URL_FALLBACK_MESSAGE"),
      ).not.toBeInTheDocument(),
    );
  });

  test("retries scoped copy after fallback when clipboard becomes available", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    mockedUseRouter.mockReturnValue({
      query: {
        preset: "provider-ack-sla-default",
        p: "1",
        limit: "20",
      },
      pathname: "/logs",
      push: jest.fn(),
    });

    render(<AuditLogsContainer />);

    fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL"));
    expect(
      screen.getByText("FILTER_PRESET_COPY_URL_FALLBACK_MESSAGE"),
    ).toBeInTheDocument();

    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL_RETRY"));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.queryByText("FILTER_PRESET_COPY_URL_FALLBACK_MESSAGE"),
      ).not.toBeInTheDocument(),
    );
    const emittedEvents = dispatchSpy.mock.calls.map(
      ([event]) => (event as CustomEvent).detail?.event,
    );
    expect(emittedEvents).toContain("retry_success");
    const retryEvent = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .find((event) => event.detail?.event === "retry_success");
    expectScopedCopyDetailKeyParity(
      retryEvent?.detail as Record<string, unknown>,
    );
    expect(retryEvent?.detail?.copyMode).toBe("clipboard");
    expect(retryEvent?.detail?.isPresetActive).toBe(true);
    expect(retryEvent?.detail?.canOpenScopedUrl).toBe(true);
    expect(retryEvent?.detail?.copyButtonLabel).toBe("retry");
    const retryCopiedUrl = (writeText as jest.Mock).mock.calls[0][0] as string;
    expect(retryEvent?.detail?.scopedUrlLengthBucket).toBe(
      resolveScopedUrlLengthBucket(retryCopiedUrl),
    );
    expect(retryEvent?.detail?.scopedQueryKeyCount).toBe(
      resolveScopedQueryKeyCount(retryCopiedUrl),
    );
    expect(retryEvent?.detail?.scopedQueryKeySignature).toBe(
      resolveScopedQueryKeySignature(retryCopiedUrl),
    );
    expect(retryEvent?.detail?.explicitOverrideCount).toBe(0);
    expect(retryEvent?.detail?.explicitOverrideKeySignature).toBe("none");
    expect(retryEvent?.detail?.appliedFilterKeySignature).toBe(
      "action|targetId",
    );
    expect(retryEvent?.detail?.nonEmptyFilterCount).toBe(2);
    dispatchSpy.mockRestore();
  });

  test("shows manual-copy fallback when clipboard write fails", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const writeText = jest.fn().mockRejectedValue(new Error("denied"));
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });
      mockedUseApi.mockReturnValue([
        triggerApi,
        false,
        { succeeded: true, data: { items: [], pagination: {} } },
        jest.fn(),
        jest.fn(),
      ]);
      mockedUseRouter.mockReturnValue({
        query: {
          preset: "provider-ack-sla-default",
          action: "provider.stream.reassigned",
          p: "1",
          limit: "20",
        },
        pathname: "/logs",
        push: jest.fn(),
      });

      render(<AuditLogsContainer />);

      fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL"));

      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(
        screen.getByText("FILTER_PRESET_COPY_URL_FALLBACK_MESSAGE"),
      ).toBeInTheDocument();
      const fallbackInput = screen.getByTestId(
        "audit-scoped-url-fallback",
      ) as HTMLInputElement;
      expect(fallbackInput.value).toContain(
        "action=provider.stream.reassigned",
      );
      const emittedEvents = dispatchSpy.mock.calls.map(
        ([event]) => (event as CustomEvent).detail?.event,
      );
      expect(emittedEvents).toContain("fallback_write_failed");
      const fallbackFailureEvent = dispatchSpy.mock.calls
        .map(([event]) => event as CustomEvent)
        .find((event) => event.detail?.event === "fallback_write_failed");
      expectScopedCopyDetailKeyParity(
        fallbackFailureEvent?.detail as Record<string, unknown>,
      );
      expect(fallbackFailureEvent?.detail?.copyMode).toBe("manualFallback");
      expect(fallbackFailureEvent?.detail?.isPresetActive).toBe(true);
      expect(fallbackFailureEvent?.detail?.canOpenScopedUrl).toBe(true);
      expect(fallbackFailureEvent?.detail?.copyButtonLabel).toBe("copy");
      expect(fallbackFailureEvent?.detail?.scopedUrlLengthBucket).toBe(
        resolveScopedUrlLengthBucket(fallbackInput.value),
      );
      expect(fallbackFailureEvent?.detail?.scopedQueryKeyCount).toBe(
        resolveScopedQueryKeyCount(fallbackInput.value),
      );
      expect(fallbackFailureEvent?.detail?.scopedQueryKeySignature).toBe(
        resolveScopedQueryKeySignature(fallbackInput.value),
      );
      expect(fallbackFailureEvent?.detail?.explicitOverrideCount).toBe(1);
      expect(fallbackFailureEvent?.detail?.explicitOverrideKeySignature).toBe(
        "action",
      );
      expect(fallbackFailureEvent?.detail?.appliedFilterKeySignature).toBe(
        "action|targetId",
      );
      expect(fallbackFailureEvent?.detail?.nonEmptyFilterCount).toBe(2);
    } finally {
      consoleErrorSpy.mockRestore();
      dispatchSpy.mockRestore();
    }
  });

  test("keeps fallback open action safe when window.open is unavailable", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const originalOpen = window.open;
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    mockedUseApi.mockReturnValue([
      triggerApi,
      false,
      { succeeded: true, data: { items: [], pagination: {} } },
      jest.fn(),
      jest.fn(),
    ]);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    mockedUseRouter.mockReturnValue({
      query: {
        preset: "provider-ack-sla-default",
        p: "1",
        limit: "20",
      },
      pathname: "/logs",
      push: jest.fn(),
    });

    try {
      Object.defineProperty(window, "open", {
        configurable: true,
        value: undefined,
      });

      render(<AuditLogsContainer />);

      fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL"));
      fireEvent.click(screen.getByText("FILTER_PRESET_COPY_URL_OPEN"));

      expect(
        screen.getByText("FILTER_PRESET_COPY_URL_FALLBACK_MESSAGE"),
      ).toBeInTheDocument();
      const fallbackEvent = dispatchSpy.mock.calls
        .map(([event]) => event as CustomEvent)
        .find((event) => event.detail?.event === "fallback_unavailable");
      expectScopedCopyDetailKeyParity(
        fallbackEvent?.detail as Record<string, unknown>,
      );
      expect(fallbackEvent?.detail?.canOpenScopedUrl).toBe(false);
      expect(fallbackEvent?.detail?.copyButtonLabel).toBe("copy");
      const fallbackInput = screen.getByTestId(
        "audit-scoped-url-fallback",
      ) as HTMLInputElement;
      expect(fallbackEvent?.detail?.scopedUrlLengthBucket).toBe(
        resolveScopedUrlLengthBucket(fallbackInput.value),
      );
      expect(fallbackEvent?.detail?.scopedQueryKeyCount).toBe(
        resolveScopedQueryKeyCount(fallbackInput.value),
      );
      expect(fallbackEvent?.detail?.scopedQueryKeySignature).toBe(
        resolveScopedQueryKeySignature(fallbackInput.value),
      );
      expect(fallbackEvent?.detail?.explicitOverrideCount).toBe(0);
      expect(fallbackEvent?.detail?.explicitOverrideKeySignature).toBe("none");
      expect(fallbackEvent?.detail?.appliedFilterKeySignature).toBe(
        "action|targetId",
      );
      expect(fallbackEvent?.detail?.nonEmptyFilterCount).toBe(2);
    } finally {
      dispatchSpy.mockRestore();
      Object.defineProperty(window, "open", {
        configurable: true,
        value: originalOpen,
      });
    }
  });
});
