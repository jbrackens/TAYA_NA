import React, { useEffect, useState } from "react";
import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
  Id,
  Button as ButtonEnum,
  Method,
  SelectionOdd,
} from "@phoenix-ui/utils";
import { useApi } from "../../../../services/api/api-service";
import { Button, Modal, Form, Select, Input } from "antd";
import { GoldOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

export type GoMarketSettleProps = {
  id: Id;
  lifecycle: MarketLifecycleType;
  selections: SelectionOdd[];
  label: string;
  onComplete: Function;
};

/**
 * Market-specific single-winner settle control for Go POST /admin/markets/:id/settle.
 *
 * - Single outcome select (NOT multi-select)
 * - Maps winningSelectionId → winning_outcome_id for Go contract
 * - Only visible for BETTABLE markets
 * - No resettle path
 */
const GoMarketSettle = ({
  id,
  lifecycle,
  selections,
  label,
  onComplete,
}: GoMarketSettleProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const [triggerApi, loading, response] = useApi(
    "admin/markets/:id/settle",
    Method.POST,
  );

  const visible = lifecycle === MarketLifecycleTypeEnum.BETTABLE;

  useEffect(() => {
    if (response.succeeded) {
      setIsModalVisible(false);
      form.resetFields();
      onComplete();
    }
  }, [response.succeeded]);

  useEffect(() => {
    if (!isModalVisible) {
      form.resetFields();
    }
  }, [isModalVisible]);

  const onFinish = async (values: any) => {
    try {
      await triggerApi(
        {
          winning_outcome_id: values.winning_outcome_id,
          reason: values.reason || "",
        },
        { id },
      );
    } catch (err) {
      console.error({ err });
    }
  };

  if (!visible) return null;

  return (
    <>
      <Button
        shape={ButtonEnum.Shape.ROUND}
        icon={<GoldOutlined />}
        type={ButtonEnum.Type.PRIMARY}
        loading={loading}
        onClick={() => setIsModalVisible(true)}
      >
        {label}
      </Button>
      <Modal
        title="Settle Market"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form onFinish={onFinish} form={form}>
          <Form.Item
            label="Winning Outcome"
            name="winning_outcome_id"
            rules={[
              {
                required: true,
                message: "Please select the winning outcome",
              },
            ]}
          >
            <Select
              showSearch
              loading={loading}
              placeholder="Select winning outcome"
              filterOption={false}
              notFoundContent={null}
            >
              {selections?.map((item: SelectionOdd) => (
                <Option
                  key={`outcome-${item.selectionId}`}
                  value={item.selectionId}
                >
                  {item.selectionName}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Reason"
            name="reason"
            rules={[
              {
                required: true,
                message: "Please provide a settlement reason",
              },
            ]}
          >
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button
              htmlType="submit"
              type="primary"
              loading={loading}
            >
              Confirm Settlement
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default GoMarketSettle;
