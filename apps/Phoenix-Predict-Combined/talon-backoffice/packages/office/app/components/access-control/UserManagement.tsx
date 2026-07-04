"use client";

import { useState } from "react";
import {
  App,
  Badge,
  Button,
  Dropdown,
  Space,
  Table,
  Tag,
  Typography,
  type MenuProps,
  type TableColumnsType,
} from "antd";
import {
  deleteUser,
  resetUserMfa,
  setUserStatus,
  SUPER_ADMIN_ROLE_ID,
  type RbacRole,
  type RbacUser,
} from "../../lib/rbac-api";
import CreateUserModal from "./CreateUserModal";
import EditRolesModal from "./EditRolesModal";
import ResetPasswordModal from "./ResetPasswordModal";
import { usePermissions } from "../../lib/permissions";

const { Title, Text } = Typography;

interface Props {
  users: RbacUser[];
  roles: RbacRole[];
  onChanged: () => void | Promise<void>;
}

export default function UserManagement({ users, roles, onChanged }: Props) {
  const { message, modal } = App.useApp();
  // GAP-84 (§29): gate the mutating "Create user" control on the same permission
  // the gateway enforces (users:write), so a read-only admin (e.g. the Auditor
  // role) sees it disabled rather than clicking into a 403.
  const { can } = usePermissions();
  const canManageUsers = can("users:write");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<RbacUser | null>(null);
  const [resetUser, setResetUser] = useState<RbacUser | null>(null);

  // Drives the last-super-admin lockout guard in EditRolesModal.
  const superAdminCount = users.filter((user) =>
    user.roles.some((role) => role.id === SUPER_ADMIN_ROLE_ID),
  ).length;

  const toggleStatus = async (user: RbacUser) => {
    const next = user.status === "active" ? "suspended" : "active";
    try {
      await setUserStatus(user.id, next);
      message.success(
        `${user.email} ${next === "active" ? "activated" : "suspended"}`,
      );
      await onChanged();
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  };

  const confirmDelete = (user: RbacUser) => {
    modal.confirm({
      title: `Delete ${user.name}?`,
      content: `This permanently removes ${user.email} and their role assignments.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteUser(user.id);
          message.success(`Deleted ${user.email}`);
          await onChanged();
        } catch (err: unknown) {
          message.error(
            err instanceof Error ? err.message : "Failed to delete user",
          );
          throw err; // keep the dialog open on failure
        }
      },
    });
  };

  // GAP-88 (§25 / §11): lost-device MFA recovery. Security-sensitive — clearing
  // a staff MFA factor lets them re-enroll, so confirm before proxying to the
  // audited mfa-reset endpoint (mfa.admin_reset). The whole row menu is already
  // gated on users:write; the backend re-checks it regardless.
  const confirmMfaReset = (user: RbacUser) => {
    modal.confirm({
      title: `Reset MFA for ${user.name}?`,
      content: `This clears ${user.email}'s multi-factor authentication factor so they can re-enroll on next sign-in. Use only for verified lost-device recovery — the action is audited.`,
      okText: "Reset MFA",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await resetUserMfa(user.id);
          message.success(`MFA reset for ${user.email}`);
          await onChanged();
        } catch (err: unknown) {
          message.error(
            err instanceof Error ? err.message : "Failed to reset MFA",
          );
          throw err; // keep the dialog open on failure
        }
      },
    });
  };

  const rowMenu = (user: RbacUser): MenuProps => ({
    items: [
      {
        key: "reset",
        label: "Reset password",
        onClick: () => setResetUser(user),
      },
      {
        key: "mfa-reset",
        label: "Reset MFA",
        onClick: () => confirmMfaReset(user),
      },
      {
        key: "status",
        label: user.status === "active" ? "Suspend" : "Activate",
        onClick: () => toggleStatus(user),
      },
      { type: "divider" },
      {
        key: "delete",
        label: "Delete",
        danger: true,
        onClick: () => confirmDelete(user),
      },
    ],
  });

  const columns: TableColumnsType<RbacUser> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 240,
      render: (email: string) => <Text type="secondary">{email}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: RbacUser["status"]) => (
        <Badge
          status={status === "active" ? "success" : "error"}
          text={status === "active" ? "Active" : "Suspended"}
        />
      ),
    },
    {
      title: "Roles",
      key: "roles",
      render: (_, user) =>
        user.roles.length === 0 ? (
          <Text type="secondary">No roles</Text>
        ) : (
          <Space size={[4, 4]} wrap>
            {user.roles.map((role) => (
              <Tag key={role.id} color="geekblue">
                {role.name}
              </Tag>
            ))}
          </Space>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, user) => (
        <Space>
          {/* GAP-84: user/role mutations are gated on users:write, so a
              read-only admin sees them disabled (backend still enforces). */}
          <Button
            size="small"
            onClick={() => setEditUser(user)}
            disabled={!canManageUsers}
            title={
              canManageUsers ? undefined : "Requires the users:write permission"
            }
          >
            Edit roles
          </Button>
          <Dropdown
            menu={rowMenu(user)}
            trigger={["click"]}
            disabled={!canManageUsers}
          >
            <Button
              size="small"
              aria-label="More actions"
              disabled={!canManageUsers}
            >
              ⋯
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Title level={4} className="!m-0">
            Back-office users
          </Title>
          <Text type="secondary">Staff accounts and their assigned roles.</Text>
        </div>
        <Button
          type="primary"
          onClick={() => setCreateOpen(true)}
          disabled={!canManageUsers}
          title={
            canManageUsers
              ? undefined
              : "You do not have permission to create users (users:write)"
          }
        >
          Create user
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: "max-content" }}
      />

      <CreateUserModal
        open={createOpen}
        roles={roles}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await onChanged();
        }}
      />

      <EditRolesModal
        open={editUser !== null}
        user={editUser}
        roles={roles}
        lockSuperAdminRemoval={
          editUser !== null &&
          editUser.roles.some((role) => role.id === SUPER_ADMIN_ROLE_ID) &&
          superAdminCount <= 1
        }
        onClose={() => setEditUser(null)}
        onSaved={async () => {
          setEditUser(null);
          await onChanged();
        }}
      />

      <ResetPasswordModal
        open={resetUser !== null}
        user={resetUser}
        onClose={() => setResetUser(null)}
      />
    </>
  );
}
