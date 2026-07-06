import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConfigFlagsPage from "../app/(dashboard)/config/flags/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-104 (§25 Brand Registry/feature flags; §8): the config-flags editor lists
// flags (config:read) and upserts value/description via PUT {key}
// (config:write, audited config.flag_updated with before→after). Save/New/inputs
// gate fail-closed on config:write; the gateway re-checks + audits.

const flag = {
  key: "crm.campaign_dispatch_enabled",
  value: "false",
  description: "Launch-mode campaign dispatch gate",
  updatedBy: "admin",
  updatedAt: "2026-03-01T00:00:00Z",
};

let calls: { url: string; method: string; body?: string }[] = [];

function mockFetch() {
  calls = [];
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    calls.push({ url, method, body: init?.body as string | undefined });
    if (method === "PUT") {
      return Promise.resolve(
        new Response(JSON.stringify(flag), { status: 200 }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ flags: [flag] }), { status: 200 }),
    );
  }) as unknown as typeof fetch;
}

function renderPage(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <ConfigFlagsPage />
    </PermissionsContext.Provider>,
  );
}

describe("Config flags page (GAP-104)", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("lists flags and disables Save/New/inputs for a read-only caller", async () => {
    renderPage(["config:read"]);
    await screen.findByTestId("flag-edit-crm.campaign_dispatch_enabled");
    expect(screen.getByTestId("flag-new")).toBeDisabled();
    expect(screen.getByTestId("flag-save")).toBeDisabled();
    expect(screen.getByTestId("flag-key")).toBeDisabled();
    expect(screen.getByTestId("flag-value")).toBeDisabled();
    expect(screen.getByTestId("flag-description")).toBeDisabled();
  });

  it("edits a flag and PUTs the upsert for a config:write caller", async () => {
    renderPage(["config:write", "config:read"]);
    fireEvent.click(
      await screen.findByTestId("flag-edit-crm.campaign_dispatch_enabled"),
    );
    expect((screen.getByTestId("flag-value") as HTMLInputElement).value).toBe(
      "false",
    );
    fireEvent.change(screen.getByTestId("flag-value"), {
      target: { value: "true" },
    });
    const save = screen.getByTestId("flag-save");
    expect(save).not.toBeDisabled();
    fireEvent.click(save);
    await waitFor(() =>
      expect(
        calls.some(
          (c) =>
            c.method === "PUT" &&
            c.url.includes(
              "/api/v1/admin/config/flags/crm.campaign_dispatch_enabled",
            ) &&
            (c.body ?? "").includes('"value":"true"'),
        ),
      ).toBe(true),
    );
  });
});
