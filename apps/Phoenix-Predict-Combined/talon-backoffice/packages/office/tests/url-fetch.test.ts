import { describe, expect, it } from "vitest";
import { extractArticle, fetchAndExtractArticle } from "../lib/ingest/urlFetch";
import { SSRFError } from "../lib/ingest/ssrfGuard";

const SAMPLE_HTML = `<!DOCTYPE html><html><head><title>ICC Warrants Expected</title></head><body>
<article>
<h1>Additional ICC warrants expected soon</h1>
<p>The International Criminal Court is expected to confirm additional arrest warrants
related to the Philippines drug war investigation, according to people familiar with the matter.</p>
<p>Prosecutors have been building cases for several years, and observers say new public
confirmations could come before the end of July. The court has not commented on the timing.</p>
<p>Analysts caution that sealed warrants may exist without public confirmation, which
complicates any assessment of progress in the long-running investigation.</p>
<p>Officials in Manila have repeatedly disputed the court's jurisdiction, while
human-rights groups continue to press for accountability in the case.</p>
</article></body></html>`;

describe("extractArticle", () => {
  it("extracts readable text and a title from HTML (no network)", () => {
    const a = extractArticle(SAMPLE_HTML, "https://example.com/icc");
    expect(a.title && a.title.length).toBeTruthy();
    expect(a.text).toContain("International Criminal Court");
    expect(a.text.length).toBeGreaterThan(100);
  });
});

describe("fetchAndExtractArticle SSRF pre-check", () => {
  it("rejects cloud-metadata IPs before any network I/O", async () => {
    await expect(
      fetchAndExtractArticle("http://169.254.169.254/latest/meta-data/"),
    ).rejects.toBeInstanceOf(SSRFError);
  });

  it("rejects non-http(s) schemes", async () => {
    await expect(
      fetchAndExtractArticle("file:///etc/passwd"),
    ).rejects.toBeInstanceOf(SSRFError);
  });

  it("rejects loopback literals", async () => {
    await expect(
      fetchAndExtractArticle("http://127.0.0.1:9200/"),
    ).rejects.toBeInstanceOf(SSRFError);
  });
});
