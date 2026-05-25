// Pure request-validation + auth helpers for the draft route (plan §11.2, §7.3).
// Kept separate from the route handler so they are unit-testable without
// NextRequest / the LLM / the gateway.

export interface ParsedDraftRequest {
  articleText?: string;
  sourceUrl?: string;
  userNotes?: string;
}

export const MAX_ARTICLE_TEXT_CHARS = 120_000;

export type ParseResult =
  | { ok: true; value: ParsedDraftRequest }
  | { ok: false; error: string };

export function parseDraftRequest(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "request body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  const articleText =
    typeof b.articleText === "string" ? b.articleText.trim() : undefined;
  const sourceUrl =
    typeof b.sourceUrl === "string" ? b.sourceUrl.trim() : undefined;
  const userNotes =
    typeof b.userNotes === "string" ? b.userNotes.trim() : undefined;

  if (!articleText && !sourceUrl) {
    return { ok: false, error: "provide articleText or sourceUrl" };
  }
  // §11.2 — pasted text needs enough signal unless a URL is given.
  if (articleText && !sourceUrl && articleText.length < 500) {
    return {
      ok: false,
      error:
        "articleText must be at least 500 characters, or provide a sourceUrl",
    };
  }
  if (articleText && articleText.length > MAX_ARTICLE_TEXT_CHARS) {
    return {
      ok: false,
      error: `articleText must be at most ${MAX_ARTICLE_TEXT_CHARS} characters`,
    };
  }
  if (userNotes && userNotes.length > 2000) {
    return { ok: false, error: "userNotes must be at most 2000 characters" };
  }
  return { ok: true, value: { articleText, sourceUrl, userNotes } };
}

export interface AdminAuth {
  accessToken: string;
  csrfToken?: string;
  role?: string;
}

export type AuthResult =
  | { ok: true; auth: AdminAuth }
  | { ok: false; status: number; error: string };

// Best-effort admin pre-gate so we never run the LLM for an unauthenticated or
// non-admin caller. This is NOT the authoritative check — the JWT signature is
// not verified here; the Go gateway authoritatively enforces admin + CSRF on
// the provenance-persist call. (Office /api/* routes are not covered by the
// office proxy auth guard — plan §7.3.)
export function extractAdminAuth(
  getCookie: (name: string) => string | undefined,
): AuthResult {
  const accessToken = getCookie("access_token");
  if (!accessToken) {
    return { ok: false, status: 401, error: "not authenticated" };
  }
  const role = decodeJwtRole(accessToken);
  if (role && role !== "admin") {
    return { ok: false, status: 403, error: "admin role required" };
  }
  return {
    ok: true,
    auth: { accessToken, csrfToken: getCookie("csrf_token"), role },
  };
}

function decodeJwtRole(token: string): string | undefined {
  const parts = token.split(".");
  if (parts.length < 2) return undefined;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    return typeof payload.role === "string" ? payload.role : undefined;
  } catch {
    return undefined;
  }
}
