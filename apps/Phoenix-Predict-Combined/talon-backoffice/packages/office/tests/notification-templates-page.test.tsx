import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import NotificationTemplatesPage from "../app/(dashboard)/notifications/templates/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-94 (§20 template registry / §25 Email Templates): the notification-template
// editor lists templates (notifications:read) and upserts subject/body via PUT
// (notifications:write). The Save/New controls gate fail-closed on
// notifications:write (GAP-84); the gateway re-checks + audits.

const template = {
  key: "kyc_reminder",
  subject: "Please verify",
  body: "Hi {{.Name}}, please verify.",
  updatedBy: "admin",
  updatedAt: "2026-03-01T00:00:00Z",
};

let calls: { url: string; method: string }[] = [];

function mockFetch() {
  calls = [];
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    calls.push({ url, method });
    if (method === "PUT") {
      return Promise.resolve(
        new Response(JSON.stringify(template), { status: 200 }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ templates: [template] }), { status: 200 }),
    );
  }) as unknown as typeof fetch;
}

function renderPage(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <NotificationTemplatesPage />
    </PermissionsContext.Provider>,
  );
}

describe("Notification templates page", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("lists templates and disables Save/New for a read-only caller", async () => {
    renderPage(["notifications:read"]);
    await screen.findByTestId("template-edit-kyc_reminder");
    expect(screen.getByTestId("template-new")).toBeDisabled();
    expect(screen.getByTestId("template-save")).toBeDisabled();
    expect(screen.getByTestId("template-key")).toBeDisabled();
    expect(screen.getByTestId("template-subject")).toBeDisabled();
    expect(screen.getByTestId("template-body")).toBeDisabled();
  });

  it("edits a template and PUTs the upsert for a notifications:write caller", async () => {
    renderPage(["notifications:write", "notifications:read"]);
    fireEvent.click(await screen.findByTestId("template-edit-kyc_reminder"));
    // form populated from the row
    expect(
      (screen.getByTestId("template-subject") as HTMLInputElement).value,
    ).toBe("Please verify");
    const save = screen.getByTestId("template-save");
    expect(save).not.toBeDisabled();
    fireEvent.change(screen.getByTestId("template-subject"), {
      target: { value: "Please verify now" },
    });
    fireEvent.click(save);
    // wait a microtask for the async PUT
    await screen.findByTestId("template-editor");
    expect(
      calls.some(
        (c) =>
          c.method === "PUT" &&
          c.url.includes("/api/v1/admin/notification-templates/kyc_reminder"),
      ),
    ).toBe(true);
  });
});
