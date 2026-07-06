import {
  normalizeAcceptTermsResponse,
  normalizeTermsResponse,
} from "../terms-client";

describe("terms client normalization", () => {
  test("normalizes phoenix config terms payload", () => {
    // Raw Go payload — only snake_case fields, no normalized fields yet
    const normalized = normalizeTermsResponse({
      current_terms_version: "1",
      terms_content: "<h1>Phoenix Terms</h1>",
    } as any);

    expect(normalized.version).toBe("1");
    expect(normalized.content).toBe("<h1>Phoenix Terms</h1>");
  });

  test("normalizes accept terms response flags and timestamps", () => {
    // Raw Go payload — only snake_case fields
    const normalized = normalizeAcceptTermsResponse({
      user_id: "u-1",
      has_to_accept_terms: false,
      terms: {
        accepted_at: "2026-03-18T00:58:07Z",
        version: "1",
      },
    } as any);

    expect(normalized.success).toBe(true);
    expect(normalized.hasToAcceptTerms).toBe(false);
    expect(normalized.terms?.acceptedAt).toBe("2026-03-18T00:58:07Z");
    expect(normalized.terms?.version).toBe("1");
  });
});
