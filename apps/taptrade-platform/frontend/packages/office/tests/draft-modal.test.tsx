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

// Points/quality pipeline v2 validation shape (2026-07-07): the modal
// renders readiness, commercial, known-outcome and suggestion fields.
const okValidation = {
  ok: true,
  errors: [],
  warnings: [],
  blocked: false,
  requiresHumanReview: true,
  readiness: "ready",
  categoryFindings: [],
  knownOutcomeRisk: { risk: "low", explanation: "no known-outcome signals" },
  commercialScore: { score: 70, label: "high", reasons: ["timely"] },
  editSuggestions: [],
  resolution: {
    plan: { primaryResolutionSource: "ICC official announcements" },
    vagueSource: false,
    warnings: [],
    editSuggestions: [],
  },
  validatorVersion: "market_quality_v2",
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
      aiGenerationLogIds: ["log-1"],
      analysis: { articleSummary: "summary" },
      candidates: [{ candidate, validation: okValidation }],
    });
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("generates a card and prefill calls onUse with the article source id", async () => {
    const onUse = renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Paste the article text/i), {
      target: { value: "x".repeat(600) },
    });
    fireEvent.click(screen.getByText("Generate candidates"));

    await waitFor(() =>
      expect(screen.getByText(candidate.marketQuestion)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Prefill create form"));
    expect(onUse).toHaveBeenCalledWith(
      expect.objectContaining({ marketTitle: candidate.marketTitle }),
      "src-1",
      ["log-1"],
    );
  });

  it("disables prefill for a blocked candidate", async () => {
    mockDraft({
      candidates: [
        {
          candidate: { ...candidate, riskLevel: "blocked" },
          validation: {
            ...okValidation,
            ok: false,
            errors: ["blocked"],
            blocked: true,
            readiness: "reject",
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
      expect(screen.getByText(/Blocked —/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Prefill create form").closest("button"),
    ).toBeDisabled();
  });

  it("shows the extraction preview and injection signals", async () => {
    mockDraft({
      articleSourceId: "src-1",
      aiGenerationLogIds: ["log-1"],
      analysis: { articleSummary: "summary" },
      extraction: {
        title: "ICC set to expand warrants",
        publisher: "Example News",
        domain: "example.com",
        publishedAt: "2026-07-01T00:00:00Z",
        charCount: 4200,
        extractionConfidence: 0.85,
        warnings: ["high link density — extraction may include navigation/recommended stories"],
      },
      injectionSignals: ["ignore_instructions"],
      candidates: [{ candidate, validation: okValidation }],
    });
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Paste the article text/i), {
      target: { value: "x".repeat(600) },
    });
    fireEvent.click(screen.getByText("Generate candidates"));

    await waitFor(() =>
      expect(screen.getByText(/85% confidence/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Example News/)).toBeInTheDocument();
    expect(screen.getByText(/high link density/)).toBeInTheDocument();
    expect(
      screen.getByText(/Hostile-content signals/i),
    ).toBeInTheDocument();
  });
});
