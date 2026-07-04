import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PermissionsContext, usePermissions } from "../app/lib/permissions";

// GAP-84 (§29 read-only states enforce permission scope). Two behaviours:
//  - navVisible FAILS OPEN (menu shows while loading / under the dev bypass),
//  - can FAILS CLOSED (a mutating control is enabled only once the permission is
//    positively known-held), so a read-only role sees write controls disabled.

function Probe() {
  const { can, navVisible, loading, unconstrained } = usePermissions();
  return (
    <div>
      <span data-testid="can-write">{String(can("users:write"))}</span>
      <span data-testid="nav-write">{String(navVisible("users:write"))}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="unconstrained">{String(unconstrained)}</span>
    </div>
  );
}

function renderWith(perms: string[] | null, unconstrained = false) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained }}>
      <Probe />
    </PermissionsContext.Provider>,
  );
}

const val = (id: string) => screen.getByTestId(id).textContent;

describe("usePermissions", () => {
  it("loading (perms null): can fails closed, navVisible fails open", () => {
    renderWith(null);
    expect(val("loading")).toBe("true");
    expect(val("can-write")).toBe("false"); // fail-closed: no write control yet
    expect(val("nav-write")).toBe("true"); // fail-open: menu still shows
  });

  it("holds the permission: both allow", () => {
    renderWith(["users:write", "users:read"]);
    expect(val("can-write")).toBe("true");
    expect(val("nav-write")).toBe("true");
    expect(val("loading")).toBe("false");
  });

  it("lacks the permission: can false, navVisible false", () => {
    renderWith(["users:read"]);
    expect(val("can-write")).toBe("false");
    expect(val("nav-write")).toBe("false");
  });

  it("unconstrained (dev bypass / super-admin): both allow", () => {
    renderWith([], true);
    expect(val("can-write")).toBe("true");
    expect(val("nav-write")).toBe("true");
    expect(val("unconstrained")).toBe("true");
  });
});
