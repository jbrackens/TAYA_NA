import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const officeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function exists(rel: string): boolean {
  return existsSync(resolve(officeRoot, rel));
}

function read(rel: string): string {
  return readFileSync(resolve(officeRoot, rel), "utf-8");
}

describe("legacy office Pages Router entrypoints", () => {
  const retiredPages = [
    "pages/index.tsx",
    "pages/logs/index.tsx",
    "pages/not-authorized/index.tsx",
    "pages/terms-and-conditions/index.tsx",
    "pages/account/settings/index.tsx",
    "pages/account/security/index.tsx",
  ];

  it("keeps user-facing legacy routes out of the Pages Router", () => {
    for (const rel of retiredPages) {
      expect(exists(rel), `${rel} should stay retired`).toBe(false);
    }
  });

  it("replaces retired entrypoints with App Router routes", () => {
    for (const rel of [
      "app/page.tsx",
      "app/logs/page.tsx",
      "app/not-authorized/page.tsx",
      "app/terms-and-conditions/page.tsx",
      "app/account/settings/page.tsx",
      "app/account/security/page.tsx",
    ]) {
      expect(exists(rel), `${rel} should exist`).toBe(true);
    }
  });

  it("preserves scoped audit-log filters on /logs redirects", () => {
    const logsPage = read("app/logs/page.tsx");
    expect(logsPage).toContain("new URLSearchParams");
    expect(logsPage).toContain("query.append");
    expect(logsPage).toContain('redirect(`/audit-logs');
  });
});
