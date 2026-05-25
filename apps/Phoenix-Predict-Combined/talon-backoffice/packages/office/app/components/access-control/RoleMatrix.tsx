"use client";

import { useMemo, useState } from "react";
import {
  App,
  Checkbox,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import {
  setRolePermissions,
  SUPER_ADMIN_ROLE_ID,
  type RbacPermission,
  type RbacRole,
} from "../../lib/rbac-api";

const { Title, Text } = Typography;

// super-admin is rendered fully-checked and read-only: it is the full-access
// role by definition, and letting it be de-permissioned in the UI is a lockout
// foot-gun (the server also rejects edits to it). Uses the shared
// SUPER_ADMIN_ROLE_ID constant.

const CATEGORY_LABELS: Record<string, string> = {
  users: "Users",
  access_control: "Access Control",
  markets: "Markets",
  finance: "Finance",
};

const humanizeCategory = (category: string): string =>
  CATEGORY_LABELS[category] ??
  category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// permLabel drops the "category:" prefix for a compact column header
// ("users:read" -> "read"); the full id + description live in the tooltip.
const permLabel = (id: string): string => {
  const sep = id.indexOf(":");
  return sep >= 0 ? id.slice(sep + 1) : id;
};

interface Props {
  roles: RbacRole[];
  permissions: RbacPermission[];
  onRolesChange: (roles: RbacRole[]) => void;
}

export default function RoleMatrix({
  roles,
  permissions,
  onRolesChange,
}: Props) {
  const { message } = App.useApp();
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const byCategory: Record<string, RbacPermission[]> = {};
    for (const perm of permissions) {
      if (!byCategory[perm.category]) {
        byCategory[perm.category] = [];
        order.push(perm.category);
      }
      byCategory[perm.category].push(perm);
    }
    return order.map((category) => ({ category, perms: byCategory[category] }));
  }, [permissions]);

  const togglePermission = async (
    role: RbacRole,
    permissionId: string,
    checked: boolean,
  ) => {
    const nextPermissions = checked
      ? Array.from(new Set([...role.permissions, permissionId]))
      : role.permissions.filter((id) => id !== permissionId);

    const previousRoles = roles;
    const optimistic = roles.map((candidate) =>
      candidate.id === role.id
        ? { ...candidate, permissions: nextPermissions }
        : candidate,
    );
    onRolesChange(optimistic);
    setSavingRoleId(role.id);
    try {
      const updated = await setRolePermissions(role.id, nextPermissions);
      // Reconcile with the server's canonical set (order, de-dupe).
      onRolesChange(
        optimistic.map((candidate) =>
          candidate.id === updated.id ? updated : candidate,
        ),
      );
    } catch (err: unknown) {
      onRolesChange(previousRoles); // revert the optimistic toggle
      message.error(
        err instanceof Error ? err.message : "Failed to update permissions",
      );
    } finally {
      setSavingRoleId(null);
    }
  };

  const columns: TableColumnsType<RbacRole> = [
    {
      title: "Role",
      key: "role",
      fixed: "left",
      width: 240,
      render: (_, role) => (
        <div>
          <Text strong>{role.name}</Text>
          {role.isSystem ? <Tag style={{ marginLeft: 8 }}>system</Tag> : null}
          {role.description ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {role.description}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    ...grouped.map((group) => ({
      title: humanizeCategory(group.category),
      key: group.category,
      children: group.perms.map((perm) => ({
        title: (
          <Tooltip
            title={`${perm.id}${perm.description ? ` — ${perm.description}` : ""}`}
          >
            <span>{permLabel(perm.id)}</span>
          </Tooltip>
        ),
        key: perm.id,
        align: "center" as const,
        width: 96,
        render: (_: unknown, role: RbacRole) => {
          const fullAccess = role.id === SUPER_ADMIN_ROLE_ID;
          return (
            <Checkbox
              checked={fullAccess || role.permissions.includes(perm.id)}
              disabled={fullAccess || savingRoleId === role.id}
              onChange={(event) =>
                togglePermission(role, perm.id, event.target.checked)
              }
            />
          );
        },
      })),
    })),
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Role matrix
        </Title>
        <Text type="secondary">
          Toggle a permission to grant or revoke it for a role. Changes save
          immediately. Super Admin always has full access.
        </Text>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={roles}
        pagination={false}
        bordered
        scroll={{ x: "max-content" }}
      />
    </>
  );
}
