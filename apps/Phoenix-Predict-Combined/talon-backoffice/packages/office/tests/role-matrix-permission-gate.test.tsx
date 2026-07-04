import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "antd";
import RoleMatrix from "../app/components/access-control/RoleMatrix";
import { PermissionsContext } from "../app/lib/permissions";
import type { RbacRole, RbacPermission } from "../app/lib/rbac-api";

// GAP-84 (§29, verification #26 fix): the Role Matrix tab is the sibling of User
// Management in the access-control console. Its mutating controls (Create role +
// the permission-toggle grid) are roles:write server-side, so a read-only caller
// (e.g. the GAP-80 Auditor, roles:read but not roles:write) must see them
// disabled.

const roles: RbacRole[] = [
  {
    id: "auditor",
    name: "Auditor",
    description: "Read-only",
    isSystem: false,
    permissions: [],
  },
];
const permissions: RbacPermission[] = [
  { id: "users:read", description: "View users", category: "users" },
];

function renderRM(perms: string[]) {
  return render(
    <App>
      <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
        <RoleMatrix
          roles={roles}
          permissions={permissions}
          onRolesChange={() => {}}
          onUsersChanged={() => {}}
        />
      </PermissionsContext.Provider>
    </App>,
  );
}

describe("RoleMatrix permission gate", () => {
  it("enables Create role for a caller holding roles:write", () => {
    renderRM(["roles:write", "roles:read"]);
    expect(
      screen.getByRole("button", { name: /create role/i }),
    ).not.toBeDisabled();
  });

  it("disables Create role for a read-only caller (no roles:write)", () => {
    renderRM(["roles:read"]);
    expect(screen.getByRole("button", { name: /create role/i })).toBeDisabled();
  });
});
