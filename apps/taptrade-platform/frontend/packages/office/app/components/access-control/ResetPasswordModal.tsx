"use client";

import { useState } from "react";
import { App, Form, Input, Modal } from "antd";
import { resetUserPassword, type RbacUser } from "../../lib/rbac-api";

interface Props {
  open: boolean;
  user: RbacUser | null;
  onClose: () => void;
}

interface FormValues {
  password: string;
}

export default function ResetPasswordModal({ open, user, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    if (!user) {
      return;
    }
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      await resetUserPassword(user.id, values.password);
      message.success(`Password reset for ${user.email}`);
      form.resetFields();
      onClose();
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to reset password",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={user ? `Reset password — ${user.name}` : "Reset password"}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="Reset password"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          label="New temporary password"
          name="password"
          rules={[
            { required: true, message: "Temporary password is required" },
            { min: 8, message: "Must be at least 8 characters" },
          ]}
          extra="Share securely; the user signs in with this and should change it."
        >
          <Input.Password
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
