"use client";

import { useState } from "react";
import { App, Form, Input, Modal } from "antd";
import { createRole, type RbacRole } from "../../lib/rbac-api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (role: RbacRole) => void;
}

interface FormValues {
  name: string;
  description?: string;
}

export default function CreateRoleModal({ open, onClose, onCreated }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      const role = await createRole({
        name: values.name,
        description: values.description,
      });
      message.success(`Created role "${role.name}"`);
      form.resetFields();
      onCreated(role);
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to create role",
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
      title="Create role"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="Create role"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Role name is required" }]}
          extra="The id is derived from the name (e.g. “Risk Analyst” → risk-analyst)."
        >
          <Input placeholder="Risk Analyst" autoComplete="off" />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input
            placeholder="What this role is for (optional)"
            autoComplete="off"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
