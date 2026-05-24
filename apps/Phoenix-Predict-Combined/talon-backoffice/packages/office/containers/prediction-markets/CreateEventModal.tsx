import { useState } from "react";
import { App, Form, Input, Modal, Select } from "antd";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import type {
  Category,
  PredictionEvent,
} from "@phoenix-ui/api-client/src/prediction-types";

const { TextArea } = Input;
const predictionClient = createPredictionClient();

export interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onCreated: (event: PredictionEvent) => void;
}

export default function CreateEventModal({
  open,
  onClose,
  categories,
  onCreated,
}: CreateEventModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const event = await predictionClient.createEvent({
        title: values.title as string,
        categoryId: values.categoryId as string,
        closeAt: values.closeAt as string,
        description: values.description as string | undefined,
      });
      message.success("Event created");
      form.resetFields();
      onCreated(event);
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to create event",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Create Event"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input placeholder="e.g., May 2026 FOMC" />
        </Form.Item>
        <Form.Item
          name="categoryId"
          label="Category"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Select category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <TextArea rows={2} />
        </Form.Item>
        <Form.Item
          name="closeAt"
          label="Close Date"
          rules={[{ required: true }]}
        >
          <Input type="datetime-local" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
