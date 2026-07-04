import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "antd";
import UserManagement from "../app/components/access-control/UserManagement";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-84 (§29): the mutating "Create user" control is gated on users:write, so a
// read-only admin (e.g. the Auditor role) sees it DISABLED — the read-only UI
// enforcement, on top of the gateway's own 403.

function renderUM(perms: string[]) {
  return render(
    <App>
      <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
        <UserManagement users={[]} roles={[]} onChanged={() => {}} />
      </PermissionsContext.Provider>
    </App>,
  );
}

const createButton = () => screen.getByRole("button", { name: /create user/i });

describe("UserManagement permission gate", () => {
  it("enables Create user for a caller holding users:write", () => {
    renderUM(["users:write", "users:read"]);
    expect(createButton()).not.toBeDisabled();
  });

  it("disables Create user for a read-only caller (no users:write)", () => {
    renderUM(["users:read"]);
    expect(createButton()).toBeDisabled();
  });
});
