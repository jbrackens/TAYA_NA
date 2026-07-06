"use client";

import { useEffect, useState } from "react";
import { App, Checkbox, Modal, Space, Typography } from "antd";
import {
  setUserRoles,
  SUPER_ADMIN_ROLE_ID,
  type RbacRole,
  type RbacUser,
} from "../../lib/rbac-api";

const { Text } = Typography;

interface Props {
  open: boolean;
  user: RbacUser | null;
  roles: RbacRole[];
  // When true, the user is the only remaining super-admin: keep that checkbox
  // checked and disabled so they can't lock everyone out (the server also
  // rejects this with 409).
  lockSuperAdminRemoval?: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export default function EditRolesModal({
  open,
  user,
  roles,
  lockSuperAdminRemoval,
  onClose,
  onSaved,
}: Props) {
  const { message } = App.useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(user ? user.roles.map((role) => role.id) : []);
  }, [user]);

  const handleOk = async () => {
    if (!user) {
      return;
    }
    setSaving(true);
    try {
      await setUserRoles(user.id, selected);
      message.success(`Updated roles for ${user.email}`);
      await onSaved();
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to update roles",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={user ? `Edit roles — ${user.name}` : "Edit roles"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={saving}
      okText="Save roles"
      destroyOnHidden
    >
      <Checkbox.Group
        value={selected}
        onChange={(values) => setSelected(values as string[])}
        className="w-full"
      >
        <Space direction="vertical" size="middle" className="w-full">
          {roles.map((role) => {
            const locked =
              !!lockSuperAdminRemoval && role.id === SUPER_ADMIN_ROLE_ID;
            return (
              <Checkbox key={role.id} value={role.id} disabled={locked}>
                <Text strong>{role.name}</Text>
                {role.description ? (
                  <>
                    <br />
                    <Text type="secondary">{role.description}</Text>
                  </>
                ) : null}
                {locked ? (
                  <>
                    <br />
                    <Text type="warning" className="!text-xs">
                      Cannot remove the last Super Admin.
                    </Text>
                  </>
                ) : null}
              </Checkbox>
            );
          })}
        </Space>
      </Checkbox.Group>
    </Modal>
  );
}
