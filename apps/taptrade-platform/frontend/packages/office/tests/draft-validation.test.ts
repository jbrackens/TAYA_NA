import { describe, expect, it } from "vitest";
import {
  extractAdminAuth,
  parseDraftRequest,
} from "../lib/market-bot/validation";

function jwt(role: string): string {
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `header.${payload}.sig`;
}

const cookies =
  (m: Record<string, string>) =>
  (n: string): string | undefined =>
    m[n];

describe("parseDraftRequest", () => {
  it("accepts a long pasted article", () => {
    expect(parseDraftRequest({ articleText: "x".repeat(500) }).ok).toBe(true);
  });

  it("accepts a sourceUrl even with short/no text", () => {
    expect(parseDraftRequest({ sourceUrl: "https://example.com/a" }).ok).toBe(
      true,
    );
  });

  it("rejects empty input", () => {
    expect(parseDraftRequest({}).ok).toBe(false);
  });

  it("rejects short pasted text without a url", () => {
    expect(parseDraftRequest({ articleText: "too short" }).ok).toBe(false);
  });

  it("rejects over-long notes", () => {
    expect(
      parseDraftRequest({
        sourceUrl: "https://x.co",
        userNotes: "n".repeat(2001),
      }).ok,
    ).toBe(false);
  });

  it("rejects over-long pasted articles", () => {
    expect(parseDraftRequest({ articleText: "x".repeat(120_001) }).ok).toBe(
      false,
    );
  });
});

describe("extractAdminAuth", () => {
  it("401 when access_token is missing", () => {
    const r = extractAdminAuth(cookies({}));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("allows an admin and surfaces the csrf token", () => {
    const r = extractAdminAuth(
      cookies({ access_token: jwt("admin"), csrf_token: "c123" }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.auth.csrfToken).toBe("c123");
  });

  it("403 for a non-admin role", () => {
    const r = extractAdminAuth(cookies({ access_token: jwt("trader") }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("allows when the role can't be decoded (gateway is authoritative)", () => {
    const r = extractAdminAuth(cookies({ access_token: "opaque" }));
    expect(r.ok).toBe(true);
  });
});
