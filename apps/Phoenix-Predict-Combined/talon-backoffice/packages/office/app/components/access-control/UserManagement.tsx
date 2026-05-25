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
  setUserStatus,
  SUPER_ADMIN_ROLE_ID,
  type RbacRole,
  type RbacUser,
} from "../../lib/rbac-api";
import CreateUserModal from "./CreateUserModal";
import EditRolesModal from "./EditRolesModal";
import ResetPasswordModal from "./ResetPasswordModal";

const { Title, Text } = Typography;

interface Props {
  users: RbacUser[];
  roles: RbacRole[];
  onChanged: () => void | Promise<void>;
}

export default function UserManagement({ users, roles, onChanged }: Props) {
  const { message, modal } = App.useApp();
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
      message.success(`${user.email} ${next === "active" ? "activated" : "suspended"}`);
      await onChanged();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "Failed to update status");
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
          message.error(err instanceof Error ? err.message : "Failed to delete user");
          throw err; // keep the dialog open on failure
        }
      },
    });
  };

  const rowMenu = (user: RbacUser): MenuProps => ({
    items: [
      { key: "reset", label: "Reset password", onClick: () => setResetUser(user) },
      {
        key: "status",
        label: user.status === "active" ? "Suspend" : "Activate",
        onClick: () => toggleStatus(user),
      },
      { type: "divider" },
      { key: "delete", label: "Delete", danger: true, onClick: () => confirmDelete(user) },
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
          <Button size="small" onClick={() => setEditUser(user)}>
            Edit roles
          </Button>
          <Dropdown menu={rowMenu(user)} trigger={["click"]}>
            <Button size="small" aria-label="More actions">
              ⋯
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Back-office users
          </Title>
          <Text type="secondary">
            Staff accounts and their assigned roles.
          </Text>
        </div>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
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
