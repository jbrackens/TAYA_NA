import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import DraftFromArticleModal from "../containers/prediction-markets/DraftFromArticleModal";

const candidate = {
  marketTitle: "ICC warrants before July 31?",
  marketQuestion:
    "Will the ICC confirm an additional warrant before July 31, 2026?",
  marketType: "binary",
  outcomes: ["Yes", "No"],
  proposedCloseTime: "2026-07-31T23:59:00Z",
  proposedResolutionTime: "2026-08-03T23:59:00Z",
  resolutionCriteria: { doesNotCount: [], ambiguousCases: [], timezone: "UTC" },
  resolutionSources: { primary: ["ICC"], secondary: [] },
  riskLevel: "high",
  requiresHumanReview: true,
};

const okValidation = {
  ok: true,
  errors: [],
  warnings: [],
  blocked: false,
  requiresHumanReview: true,
};

function mockDraft(payload: unknown, status = 200) {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(payload), { status }));
}

function renderModal(onUse = vi.fn()) {
  render(
    <App>
      <DraftFromArticleModal open onClose={vi.fn()} onUse={onUse} />
    </App>,
  );
  return onUse;
}

describe("DraftFromArticleModal", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    mockDraft({
      articleSourceId: "src-1",
      analysis: { articleSummary: "summary" },
      candidates: [{ candidate, validation: okValidation }],
    });
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("generates a card and 'Use this' calls onUse with the article source id", async () => {
    const onUse = renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Paste the article text/i), {
      target: { value: "x".repeat(600) },
    });
    fireEvent.click(screen.getByText("Generate candidates"));

    await waitFor(() =>
      expect(screen.getByText(candidate.marketQuestion)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Use this"));
    expect(onUse).toHaveBeenCalledWith(
      expect.objectContaining({ marketTitle: candidate.marketTitle }),
      "src-1",
    );
  });

  it("disables 'Use this' for a blocked candidate", async () => {
    mockDraft({
      candidates: [
        {
          candidate: { ...candidate, riskLevel: "blocked" },
          validation: {
            ok: false,
            errors: ["blocked"],
            warnings: [],
            blocked: true,
            requiresHumanReview: true,
          },
        },
      ],
    });
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Paste the article text/i), {
      target: { value: "x".repeat(600) },
    });
    fireEvent.click(screen.getByText("Generate candidates"));

    await waitFor(() =>
      expect(
        screen.getByText(/not eligible for publication/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Use this").closest("button")).toBeDisabled();
  });
});
