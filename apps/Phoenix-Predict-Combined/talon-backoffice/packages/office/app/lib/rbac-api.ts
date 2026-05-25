"use client";

/**
 * Typed client for the back-office RBAC (Access Control) admin API, layered on
 * adminFetch (which supplies credentials + the CSRF header on mutations). The
 * shapes mirror the Go gateway's responses in internal/http/rbac_admin_handlers.go.
 */

import { adminFetch } from "./admin-fetch";

// The seeded full-access role id. Centralized so the UI guards (Role Matrix
// read-only row, last-super-admin lockout) all reference one value, matching
// the gateway's rbac.SystemFullAccessRoleID.
export const SUPER_ADMIN_ROLE_ID = "super-admin";

export type RbacUserStatus = "active" | "suspended";

export interface RbacRoleRef {
  id: string;
  name: string;
}

export interface RbacUser {
  id: string;
  email: string;
  name: string;
  status: RbacUserStatus;
  createdAt: string;
  updatedAt: string;
  roles: RbacRoleRef[];
}

export interface RbacRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export interface RbacPermission {
  id: string;
  description: string;
  category: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
}

const BASE = "/api/v1/admin";

// parseJSON unwraps a gateway response, turning a non-2xx into a thrown Error
// carrying the gateway's message (httpx emits {"error":{"code","message"}}).
async function parseJSON<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as {
        error?: { message?: string };
        message?: string;
      };
      message = body?.error?.message || body?.message || message;
    } catch {
      // non-JSON error body — keep the status-derived message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function listUsers(): Promise<RbacUser[]> {
  const data = await parseJSON<{ users: RbacUser[] }>(
    await adminFetch(`${BASE}/users`),
  );
  return data.users ?? [];
}

export async function createUser(input: CreateUserInput): Promise<RbacUser> {
  const data = await parseJSON<{ user: RbacUser }>(
    await adminFetch(`${BASE}/users`, jsonInit("POST", input)),
  );
  return data.user;
}

export async function setUserRoles(
  userId: string,
  roleIds: string[],
): Promise<RbacUser> {
  const data = await parseJSON<{ user: RbacUser }>(
    await adminFetch(
      `${BASE}/users/${encodeURIComponent(userId)}/roles`,
      jsonInit("PUT", { roleIds }),
    ),
  );
  return data.user;
}

export async function setUserStatus(
  userId: string,
  status: RbacUserStatus,
): Promise<RbacUser> {
  const data = await parseJSON<{ user: RbacUser }>(
    await adminFetch(
      `${BASE}/users/${encodeURIComponent(userId)}/status`,
      jsonInit("PUT", { status }),
    ),
  );
  return data.user;
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  await parseJSON<{ reset: boolean }>(
    await adminFetch(
      `${BASE}/users/${encodeURIComponent(userId)}/password`,
      jsonInit("PUT", { password }),
    ),
  );
}

export async function deleteUser(userId: string): Promise<void> {
  await parseJSON<{ deleted: boolean }>(
    await adminFetch(`${BASE}/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  );
}

export async function listRolesAndPermissions(): Promise<{
  roles: RbacRole[];
  permissions: RbacPermission[];
}> {
  const data = await parseJSON<{
    roles: RbacRole[];
    permissions: RbacPermission[];
  }>(await adminFetch(`${BASE}/roles`));
  return { roles: data.roles ?? [], permissions: data.permissions ?? [] };
}

export async function createRole(input: {
  name: string;
  description?: string;
}): Promise<RbacRole> {
  const data = await parseJSON<{ role: RbacRole }>(
    await adminFetch(`${BASE}/roles`, jsonInit("POST", input)),
  );
  return data.role;
}

export async function deleteRole(roleId: string): Promise<void> {
  await parseJSON<{ deleted: boolean }>(
    await adminFetch(`${BASE}/roles/${encodeURIComponent(roleId)}`, {
      method: "DELETE",
    }),
  );
}

export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<RbacRole> {
  const data = await parseJSON<{ role: RbacRole }>(
    await adminFetch(
      `${BASE}/roles/${encodeURIComponent(roleId)}/permissions`,
      jsonInit("PUT", { permissionIds }),
    ),
  );
  return data.role;
}
