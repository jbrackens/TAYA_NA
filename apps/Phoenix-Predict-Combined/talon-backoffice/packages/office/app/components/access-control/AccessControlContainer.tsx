"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs } from "antd";
import { ErrorState, SkeletonLoader } from "../shared";
import {
  listRolesAndPermissions,
  listUsers,
  type RbacPermission,
  type RbacRole,
  type RbacUser,
} from "../../lib/rbac-api";
import UserManagement from "./UserManagement";
import RoleMatrix from "./RoleMatrix";

// AccessControlContainer is the back-office RBAC console: a User Management tab
// (staff accounts + role assignment) and a Role Matrix tab (roles x permissions).
// All data flows from the Go gateway's /api/v1/admin/{users,roles} endpoints.
export default function AccessControlContainer() {
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedUsers, rolesAndPerms] = await Promise.all([
        listUsers(),
        listRolesAndPermissions(),
      ]);
      setUsers(loadedUsers);
      setRoles(rolesAndPerms.roles);
      setPermissions(rolesAndPerms.permissions);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load access control data",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-pull just the users list after a create/edit so the table reflects the
  // server's canonical view (ids, timestamps, normalized email).
  const refreshUsers = useCallback(async () => {
    setUsers(await listUsers());
  }, []);

  if (isLoading) {
    return <SkeletonLoader count={4} />;
  }
  if (error) {
    return (
      <ErrorState
        title="Failed to load Access Control"
        message={error}
        onRetry={load}
        showRetryButton
      />
    );
  }

  return (
    <Tabs
      defaultActiveKey="users"
      items={[
        {
          key: "users",
          label: "User Management",
          children: (
            <UserManagement
              users={users}
              roles={roles}
              onChanged={refreshUsers}
            />
          ),
        },
        {
          key: "roles",
          label: "Role Matrix",
          children: (
            <RoleMatrix
              roles={roles}
              permissions={permissions}
              onRolesChange={setRoles}
            />
          ),
        },
      ]}
    />
  );
}
