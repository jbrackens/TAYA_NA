"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { adminFetch } from "./admin-fetch";

// GAP-84 (§29 UI Requirements: "read-only states clearly enforce permission
// scope"). The signed-in admin's effective permissions are fetched ONCE from
// GET /api/v1/admin/me and shared via context, so both the sidebar (a fail-open
// UX hint) and mutating controls (fail-closed read-only enforcement) read the
// same source. The gateway stays the real authorization boundary; this context
// is defense-in-depth + UX, never the security boundary.

interface PermissionsState {
  perms: string[] | null; // null = not loaded yet
  unconstrained: boolean;
}

// Exported so tests (and any advanced caller) can inject a fixed permission
// state without the async /admin/me fetch.
export const PermissionsContext = createContext<PermissionsState>({
  perms: null,
  unconstrained: false,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [perms, setPerms] = useState<string[] | null>(null);
  const [unconstrained, setUnconstrained] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminFetch("/api/v1/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { permissions?: string[]; unconstrained?: boolean } | null) => {
          if (cancelled || !data) return;
          setPerms(Array.isArray(data.permissions) ? data.permissions : []);
          setUnconstrained(Boolean(data.unconstrained));
        },
      )
      .catch(() => {
        // Leave perms === null (loading/unknown); consumers decide the posture.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PermissionsContext.Provider value={{ perms, unconstrained }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export interface UsePermissions {
  loading: boolean;
  unconstrained: boolean;
  // navVisible — FAIL-OPEN: show while permissions load, under the dev bypass, or
  // when known-held. Hiding a nav item would strand a legitimate admin (the worse
  // failure); an over-shown item simply 403s on click.
  navVisible: (permission?: string) => boolean;
  // can — FAIL-CLOSED: a mutating control is enabled ONLY once we positively know
  // the caller HOLDS the permission. This is the §29 read-only enforcement: a
  // read-only role (e.g. the GAP-80 Auditor) must not see enabled write controls.
  can: (permission: string) => boolean;
}

export function usePermissions(): UsePermissions {
  const { perms, unconstrained } = useContext(PermissionsContext);
  return {
    loading: perms === null,
    unconstrained,
    navVisible: (permission?: string) => {
      if (!permission) return true;
      if (perms === null || unconstrained) return true;
      return perms.includes(permission);
    },
    can: (permission: string) => {
      if (unconstrained) return true;
      return perms?.includes(permission) ?? false;
    },
  };
}
