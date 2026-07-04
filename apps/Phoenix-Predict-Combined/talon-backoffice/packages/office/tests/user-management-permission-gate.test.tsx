import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import UserManagement from "../app/components/access-control/UserManagement";
import { PermissionsContext } from "../app/lib/permissions";
import type { RbacUser } from "../app/lib/rbac-api";

// GAP-84 (§29): every mutating user/role control is gated on users:write, so a
// read-only admin (e.g. the Auditor role) sees them DISABLED — the read-only UI
// enforcement, on top of the gateway's own 403.

const sampleUser: RbacUser = {
  id: "u-1",
  email: "ada@x.local",
  name: "Ada",
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  roles: [{ id: "auditor", name: "Auditor" }],
};

function renderUM(perms: string[]) {
  return render(
    <App>
      <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
        <UserManagement users={[sampleUser]} roles={[]} onChanged={() => {}} />
      </PermissionsContext.Provider>
    </App>,
  );
}

const byName = (re: RegExp) => screen.getByRole("button", { name: re });

describe("UserManagement permission gate", () => {
  it("enables all user/role mutations for a caller holding users:write", () => {
    renderUM(["users:write", "users:read"]);
    expect(byName(/create user/i)).not.toBeDisabled();
    expect(byName(/edit roles/i)).not.toBeDisabled();
    expect(byName(/more actions/i)).not.toBeDisabled();
  });

  it("disables all user/role mutations for a read-only caller", () => {
    renderUM(["users:read"]);
    expect(byName(/create user/i)).toBeDisabled();
    expect(byName(/edit roles/i)).toBeDisabled();
    expect(byName(/more actions/i)).toBeDisabled();
  });
});

// GAP-88 (§25 / §11): the row menu offers lost-device MFA recovery, which
// proxies to the audited PUT /users/{id}/mfa-reset endpoint after a confirm.
describe("UserManagement MFA reset", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("resets MFA via the audited mfa-reset endpoint after confirmation", async () => {
    const calls: { url: string; method: string }[] = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: (init?.method || "GET").toUpperCase(),
      });
      return Promise.resolve(
        new Response(JSON.stringify({ userId: "u-1", mfaReset: true }), {
          status: 200,
        }),
      );
    }) as unknown as typeof fetch;

    renderUM(["users:write", "users:read"]);
    // Open the row action menu, then pick "Reset MFA".
    fireEvent.click(byName(/more actions/i));
    fireEvent.click(await screen.findByText("Reset MFA"));
    // Confirm in the modal — the OK button carries the same label but is the
    // only element with the button role matching it.
    fireEvent.click(await screen.findByRole("button", { name: /reset mfa/i }));

    await waitFor(() =>
      expect(
        calls.some(
          (c) =>
            c.method === "PUT" &&
            c.url.includes("/api/v1/admin/users/u-1/mfa-reset"),
        ),
      ).toBe(true),
    );
  });
});
