"use client";

import { useState } from "react";
import { App, Form, Input, Modal, Select } from "antd";
import { createUser, type RbacRole } from "../../lib/rbac-api";

interface Props {
  open: boolean;
  roles: RbacRole[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

interface FormValues {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
}

export default function CreateUserModal({
  open,
  roles,
  onClose,
  onCreated,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // field-level errors are rendered inline by the form
    }
    setSubmitting(true);
    try {
      await createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        roleIds: values.roleIds,
      });
      message.success(`Created ${values.email}`);
      form.resetFields();
      await onCreated();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "Failed to create user");
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
      title="Create user"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="Create user"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input placeholder="Jane Operator" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Email is required" },
            { type: "email", message: "Enter a valid email" },
          ]}
        >
          <Input placeholder="jane@phoenix.local" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="Temporary password"
          name="password"
          rules={[
            { required: true, message: "Temporary password is required" },
            { min: 8, message: "Must be at least 8 characters" },
          ]}
          extra="Share securely with the user; they should change it on first sign-in."
        >
          <Input.Password placeholder="At least 8 characters" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Roles"
          name="roleIds"
          rules={[{ required: true, message: "Assign at least one role" }]}
        >
          <Select
            mode="multiple"
            placeholder="Select one or more roles"
            options={roles.map((role) => ({ label: role.name, value: role.id }))}
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
