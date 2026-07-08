// POST /api/market-bot/draft — turn a pasted article (or URL) into AI-drafted
// market candidates (plan §13 / §16). Self-authenticating (office /api/* is not
// covered by the proxy auth guard); the authoritative admin + CSRF check happens
// at the Go gateway on the provenance-persist call.
//
// INTEGRATION-PENDING: the live path calls the configured LLM (needs a reachable
// endpoint + key) and the gateway (needs it running). It is type-checked and its
// pure helpers (validation, auth, budget pre-flight, drafter via mock) are
// unit-tested, but the end-to-end path is not exercised offline. The SSRF
// production egress gate (§17b) and the per-admin rate-limit + daily token cap
// (§17c) are in place; remaining before go-live: a live e2e run + the LLM eval
// suite (lib/ai/evals).

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  extractAdminAuth,
  MAX_ARTICLE_TEXT_CHARS,
  parseDraftRequest,
  type AdminAuth,
} from "../../../../lib/market-bot/validation";
import {
  fetchAndExtractArticle,
  type ExtractionMeta,
} from "../../../../lib/ingest/urlFetch";
import {
  draftMarketsFromArticleV2,
  PROMPT_VERSION_V2,
  type DraftResultV2,
} from "../../../../lib/ai/marketDrafter";
import { VALIDATOR_VERSION } from "../../../../lib/ai/marketQualityValidator";
import { checkDuplicates } from "../../../../lib/ai/marketDuplicateDetector";
import { createAISDKProvider } from "../../../../lib/ai/provider";
import { gatewayBaseUrl } from "../../../../lib/market-bot/gatewayUrl";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = extractAdminAuth((name) => request.cookies.get(name)?.value);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = parseDraftRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Ingest: prefer pasted text; otherwise SSRF-guarded fetch + extraction.
  // Extraction metadata rides along for the known-outcome checks and the
  // modal's extraction preview — bad extraction must be visible, not silent.
  let articleText = parsed.value.articleText ?? "";
  let sourceUrl = parsed.value.sourceUrl;
  let extraction: ExtractionMeta | undefined;
  if (!articleText && parsed.value.sourceUrl) {
    try {
      const fetched = await fetchAndExtractArticle(parsed.value.sourceUrl);
      articleText = fetched.text;
      sourceUrl = fetched.finalUrl;
      extraction = fetched.meta;
    } catch (err) {
      return NextResponse.json(
        { error: `could not fetch article: ${errMsg(err)}` },
        { status: 400 },
      );
    }
  } else if (articleText) {
    extraction = {
      charCount: articleText.length,
      extractionConfidence: 1,
      warnings: [],
    };
  }
  if (articleText.length < 200) {
    return NextResponse.json(
      { error: "article text is too short to generate reliable markets" },
      { status: 400 },
    );
  }
  if (articleText.length > MAX_ARTICLE_TEXT_CHARS) {
    return NextResponse.json(
      {
        error: `article text is too long; limit is ${MAX_ARTICLE_TEXT_CHARS} characters`,
      },
      { status: 400 },
    );
  }

  // Reserve budget after ingest and before LLM spend. The gateway writes a
  // draft_request log so concurrent office instances contend on one DB ledger.
  const budget = await reserveBudget(auth.auth, estimateTokens(articleText));
  if (budget) {
    return NextResponse.json(
      { error: budget.reason },
      { status: budget.status },
    );
  }

  // Draft v2 (single hard call: summary + rich candidates + event groups).
  let result: DraftResultV2;
  try {
    result = await draftMarketsFromArticleV2(createAISDKProvider(), {
      articleText,
      sourceUrl,
      userNotes: parsed.value.userNotes,
      article: {
        text: articleText,
        publishedAt: extraction?.publishedAt,
        updatedAt: extraction?.updatedAt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `drafting failed: ${errMsg(err)}` },
      { status: 502 },
    );
  }

  if (result.injectionDetected) {
    return NextResponse.json(
      {
        error: result.blockReason ?? "blocked",
        injectionDetected: true,
        injectionSignals: result.injectionSignals,
      },
      { status: 422 },
    );
  }

  // Duplicate/overlap detection against the gateway's own catalog. Fails
  // open per-candidate (warning surfaced) — a search hiccup must not block
  // drafting, but the admin must see the check didn't run.
  const gatewayBase = gatewayBaseUrl();
  await Promise.all(
    result.drafts.map(async (draft) => {
      const dup = await checkDuplicates(draft.candidate, gatewayBase);
      draft.candidate.duplicateRisk = dup.duplicateRisk;
      if (dup.eventRecommendation) {
        // Attach-to-existing (from live catalog) beats the model's
        // create-new grouping guess.
        draft.candidate.eventRecommendation = dup.eventRecommendation;
      }
      if (dup.warnings.length > 0) {
        draft.candidate.warnings = [
          ...(draft.candidate.warnings ?? []),
          ...dup.warnings,
        ];
      }
      if (
        dup.duplicateRisk &&
        dup.duplicateRisk.recommendedAction === "reject_duplicate"
      ) {
        draft.validation.readiness = "reject";
        draft.validation.warnings = [
          ...draft.validation.warnings,
          "near-exact duplicate of an existing market",
        ];
      }
    }),
  );

  // Persist provenance via the gateway (authoritative admin + CSRF gate). Never
  // send the full article body — only excerpt + summary + hash (gateway also
  // enforces a 1MB body limit, plan §16).
  const textHash = createHash("sha256").update(articleText).digest("hex");
  let articleSourceId: string | undefined;
  let aiGenerationLogIds: string[] = [];
  try {
    const persisted = await persistProvenance(auth.auth, {
      source: {
        sourceUrl,
        sourceName: extraction?.publisher ?? extraction?.domain,
        title: extraction?.title,
        author: extraction?.author,
        publishedAt: extraction?.publishedAt,
        language: extraction?.language,
        summary: result.analysis.articleSummary,
        excerpt: articleText.slice(0, 500),
        textHash,
      },
      generationLogs: result.generationLogs.map((g) => ({
        stage: g.stage,
        tier: g.tier,
        modelProvider: g.provider,
        modelName: g.model,
        inputTokens: g.inputTokens,
        outputTokens: g.outputTokens,
        promptVersion: g.promptVersion,
        // Replay/audit context in the EXISTING raw-JSON columns (never the
        // full article body — hash + metadata only).
        inputJson: JSON.stringify({
          inputType: parsed.value.articleText ? "pasted_text" : "url",
          textHash,
          canonicalUrl: extraction?.canonicalUrl,
          domain: extraction?.domain,
          publishedAt: extraction?.publishedAt,
          updatedAt: extraction?.updatedAt,
          extractionConfidence: extraction?.extractionConfidence,
          extractionWarnings: extraction?.warnings,
          injectionSignals: result.injectionSignals,
          validatorVersion: VALIDATOR_VERSION,
          promptVersion: PROMPT_VERSION_V2,
        }),
        outputJson: JSON.stringify({
          candidates: result.drafts.map((d) => d.candidate),
          eventGroups: result.eventGroups,
        }),
        validatorResult: JSON.stringify(
          result.drafts.map((d) => ({
            title: d.candidate.marketTitle,
            readiness: d.validation.readiness,
            blocked: d.validation.blocked,
            errors: d.validation.errors,
            warnings: d.validation.warnings,
            knownOutcomeRisk: d.validation.knownOutcomeRisk.risk,
            duplicateAction:
              d.candidate.duplicateRisk?.recommendedAction ?? "unchecked",
            commercialScore: d.validation.commercialScore.score,
            templateId: d.candidate.templateId,
          })),
        ),
      })),
    });
    articleSourceId = persisted.articleSourceId;
    aiGenerationLogIds = persisted.aiGenerationLogIds;
  } catch (err) {
    return NextResponse.json(
      { error: `could not persist provenance: ${errMsg(err)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    articleSourceId,
    aiGenerationLogIds,
    analysis: result.analysis,
    extraction,
    injectionSignals: result.injectionSignals,
    eventGroups: result.eventGroups,
    candidates: result.drafts.map((d) => ({
      candidate: d.candidate,
      validation: d.validation,
    })),
  });
}

interface ProvenancePayload {
  source: {
    sourceUrl?: string;
    sourceName?: string;
    title?: string;
    author?: string;
    publishedAt?: string;
    language?: string;
    summary?: string;
    excerpt?: string;
    textHash: string;
  };
  generationLogs: Array<{
    stage: string;
    tier?: string;
    modelProvider?: string;
    modelName?: string;
    inputTokens?: number;
    outputTokens?: number;
    promptVersion: string;
    inputJson?: string;
    outputJson?: string;
    validatorResult?: string;
  }>;
}

// Returns null if the admin's budget reservation succeeded; otherwise the
// {status, reason} to return to the client. Fails closed if the gateway can't be
// reached — don't spend on the LLM when we can't reserve the attempt.
async function reserveBudget(
  auth: AdminAuth,
  estimatedInputTokens: number,
): Promise<{ status: number; reason: string } | null> {
  const base = gatewayBaseUrl();
  const cookie =
    `access_token=${auth.accessToken}` +
    (auth.csrfToken ? `; csrf_token=${auth.csrfToken}` : "");
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/admin/ai-budget/reserve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        ...(auth.csrfToken ? { "X-CSRF-Token": auth.csrfToken } : {}),
      },
      body: JSON.stringify({ estimatedInputTokens }),
    });
  } catch {
    return {
      status: 503,
      reason: "could not verify AI budget (gateway unreachable)",
    };
  }
  const data = (await res
    .json()
    .catch(() => ({}))) as { allowed?: boolean; reason?: string };
  if (!res.ok) {
    return {
      status: res.status === 429 ? 429 : 503,
      reason:
        data.reason ||
        (res.status === 429
          ? "AI budget exceeded"
          : `could not verify AI budget (${res.status})`),
    };
  }
  if (data.allowed === false) {
    return { status: 429, reason: data.reason || "AI budget exceeded" };
  }
  return null;
}

async function persistProvenance(
  auth: AdminAuth,
  payload: ProvenancePayload,
): Promise<{ articleSourceId?: string; aiGenerationLogIds: string[] }> {
  const base = gatewayBaseUrl();
  const cookie =
    `access_token=${auth.accessToken}` +
    (auth.csrfToken ? `; csrf_token=${auth.csrfToken}` : "");
  const res = await fetch(`${base}/api/v1/admin/market-sources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(auth.csrfToken ? { "X-CSRF-Token": auth.csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`gateway returned ${res.status}`);
  }
  const data = (await res.json()) as {
    articleSourceId?: string;
    aiGenerationLogIds?: string[];
  };
  return {
    articleSourceId: data.articleSourceId,
    aiGenerationLogIds: data.aiGenerationLogIds ?? [],
  };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
