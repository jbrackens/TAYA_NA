// POST /api/market-bot/draft — turn a pasted article (or URL) into AI-drafted
// market candidates (plan §13 / §16). Self-authenticating (office /api/* is not
// covered by the proxy auth guard); the authoritative admin + CSRF check happens
// at the Go gateway on the provenance-persist call.
//
// INTEGRATION-PENDING: the live path calls the configured LLM (needs a reachable
// endpoint + key) and the gateway (needs it running). It is type-checked and its
// pure helpers (validation, auth, drafter via mock) are unit-tested, but the
// end-to-end path is not exercised offline. Before enabling in production, add:
// per-admin rate limiting + model spend caps (shared store), and the SSRF
// production egress gate (plan §16).

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  extractAdminAuth,
  parseDraftRequest,
  type AdminAuth,
} from "../../../../lib/market-bot/validation";
import { fetchAndExtractArticle } from "../../../../lib/ingest/urlFetch";
import {
  draftMarketsFromArticle,
  PROMPT_VERSION,
} from "../../../../lib/ai/marketDrafter";
import { createAISDKProvider } from "../../../../lib/ai/provider";

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
  let articleText = parsed.value.articleText ?? "";
  let sourceUrl = parsed.value.sourceUrl;
  if (!articleText && parsed.value.sourceUrl) {
    try {
      const fetched = await fetchAndExtractArticle(parsed.value.sourceUrl);
      articleText = fetched.text;
      sourceUrl = fetched.finalUrl;
    } catch (err) {
      return NextResponse.json(
        { error: `could not fetch article: ${errMsg(err)}` },
        { status: 400 },
      );
    }
  }
  if (articleText.length < 200) {
    return NextResponse.json(
      { error: "article text is too short to generate reliable markets" },
      { status: 400 },
    );
  }

  // Draft (routine extraction + hard drafting/risk/block gate).
  let result;
  try {
    result = await draftMarketsFromArticle(createAISDKProvider(), {
      articleText,
      sourceUrl,
      userNotes: parsed.value.userNotes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `drafting failed: ${errMsg(err)}` },
      { status: 502 },
    );
  }

  if (result.injectionDetected) {
    return NextResponse.json(
      { error: result.blockReason ?? "blocked", injectionDetected: true },
      { status: 422 },
    );
  }

  // Persist provenance via the gateway (authoritative admin + CSRF gate). Never
  // send the full article body — only excerpt + summary + hash (gateway also
  // enforces a 1MB body limit, plan §16).
  const textHash = createHash("sha256").update(articleText).digest("hex");
  let articleSourceId: string | undefined;
  try {
    articleSourceId = await persistProvenance(auth.auth, {
      source: {
        sourceUrl,
        summary: result.analysis.articleSummary,
        excerpt: articleText.slice(0, 500),
        textHash,
      },
      generationLogs: [{ stage: "draft", promptVersion: PROMPT_VERSION }],
    });
  } catch (err) {
    return NextResponse.json(
      { error: `could not persist provenance: ${errMsg(err)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    articleSourceId,
    analysis: result.analysis,
    candidates: result.drafts.map((d) => ({
      candidate: d.candidate,
      validation: d.validation,
    })),
  });
}

interface ProvenancePayload {
  source: {
    sourceUrl?: string;
    summary?: string;
    excerpt?: string;
    textHash: string;
  };
  generationLogs: Array<{ stage: string; promptVersion: string }>;
}

async function persistProvenance(
  auth: AdminAuth,
  payload: ProvenancePayload,
): Promise<string | undefined> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";
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
  const data = (await res.json()) as { articleSourceId?: string };
  return data.articleSourceId;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
