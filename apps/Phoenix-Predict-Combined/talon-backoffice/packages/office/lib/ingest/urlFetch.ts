// SSRF-guarded server-side article fetch + readable-text extraction
// (plan §7.1, locked decision 2 — in-process boundary for dev/Phase B).
//
// Layers: (1) assertSafeRequestURL pre-check (scheme + literal-IP);
// (2) request-filtering-agent validates the RESOLVED IP at socket-connect time
// for the initial request AND every redirect (defeats DNS rebinding);
// (3) a beforeRedirect hook re-validates each hop's URL. got is used (not native
// fetch/undici) precisely because request-filtering-agent is an http(s).Agent.
//
// RELEASE GATE (Codex / plan §16): this is NOT production egress isolation.
// In production, URL fetch must be blocked/degraded until an isolated egress
// proxy exists, and the redirect/DNS-pinning paths need an integration test
// against a live server. got + the agent are dynamic-imported so the pure
// pre-check and extractArticle stay unit-testable offline.

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { assertSafeRequestURL, SSRFError } from "./ssrfGuard";

export interface ExtractedArticle {
  title?: string;
  byline?: string;
  excerpt?: string;
  text: string;
}

export interface FetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxChars?: number;
}

// Pure: extract readable text from already-fetched HTML (no network).
export function extractArticle(html: string, url?: string): ExtractedArticle {
  const dom = new JSDOM(html, url ? { url } : undefined);
  const parsed = new Readability(dom.window.document).parse();
  return {
    title: parsed?.title ?? undefined,
    byline: parsed?.byline ?? undefined,
    excerpt: parsed?.excerpt ?? undefined,
    text: parsed?.textContent?.trim() ?? "",
  };
}

export async function fetchAndExtractArticle(
  rawUrl: string,
  opts: FetchOptions = {},
): Promise<ExtractedArticle & { finalUrl: string }> {
  // (1) Synchronous pre-check — throws before any network I/O for blocked URLs.
  assertSafeRequestURL(rawUrl);

  const [
    { default: got },
    { RequestFilteringHttpAgent, RequestFilteringHttpsAgent },
  ] = await Promise.all([import("got"), import("request-filtering-agent")]);

  const filterOpts = {
    allowPrivateIPAddress: false,
    allowMetaIPAddress: false,
  };
  const res = await got(rawUrl, {
    agent: {
      http: new RequestFilteringHttpAgent(filterOpts),
      https: new RequestFilteringHttpsAgent(filterOpts),
    },
    followRedirect: true,
    maxRedirects: opts.maxRedirects ?? 3,
    timeout: { request: opts.timeoutMs ?? 8000 },
    responseType: "text",
    headers: { "user-agent": "TayaNA-MarketBot/1.0 (+article-ingest)" },
    hooks: {
      // (3) Re-validate every redirect target (scheme + literal IP).
      beforeRedirect: [
        (options) => {
          if (options.url) assertSafeRequestURL(options.url.toString());
        },
      ],
    },
  });

  const contentType = res.headers["content-type"] ?? "";
  if (!/text\/html|application\/xhtml/i.test(contentType)) {
    throw new SSRFError(
      `unexpected content-type for an article: ${contentType}`,
    );
  }

  const maxChars = opts.maxChars ?? 2_000_000;
  const body =
    res.body.length > maxChars ? res.body.slice(0, maxChars) : res.body;
  return { ...extractArticle(body, res.url), finalUrl: res.url };
}
