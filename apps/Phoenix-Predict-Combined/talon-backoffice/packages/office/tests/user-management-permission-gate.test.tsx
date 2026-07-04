import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
