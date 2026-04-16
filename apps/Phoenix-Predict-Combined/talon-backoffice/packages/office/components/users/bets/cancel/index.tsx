import { Button as ButtonEnum, Method, useSpy, Id } from "@phoenix-ui/utils";
import React, { useState, useEffect } from "react";
import { useApi } from "../../../../services/api/api-service";
import { Button, Modal, Form, Input } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { StyledAlert } from "./index.styled";
import { useTranslation } from "i18n";

export type BetCancelProps = {
  key: string;
  id: Id;
  label: string;
  onComplete: Function;
};

const UserBetCancel = ({ id, label, onComplete }: BetCancelProps) => {
  const [reason, setReason] = useState("");
  const { spy } = useSpy();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [triggerApi, isLoading, response, , resetHookState] = useApi(
    `admin/bets/:id/cancel`,
    Method.POST,
  );
  const [fakeLoading, setFakeLoading] = useState(false);
  const [betCancellationForm] = Form.useForm();
  const { t } = useTranslation(["page-bets"]);
  const handleClick = () => setIsModalVisible(true);

  const handleModalCancel = () => {
    setIsModalVisible(false);
    betCancellationForm.resetFields();
    resetHookState();
  };

  const onFormFinish = (values: any) => setReason(values.reason);

  spy(reason, async ({ values }) => {
    if (values !== "") {
      try {
        await triggerApi(
          {
            cancellationReason: values,
          },
          {
            id,
          },
        );
      } catch (err) {
        console.error({ err });
      }
      setReason("");
    }
  });

  useEffect(() => {
    if (response?.succeeded) {
      setFakeLoading(true);
      setTimeout(() => {
        setIsModalVisible(false);
        betCancellationForm.resetFields();
        onComplete();
        resetHookState();
        setFakeLoading(false);
      }, 2000);
    }
  }, [response]);

  return (
    <>
      <Button
        shape={ButtonEnum.Shape.ROUND}
        icon={<CloseCircleOutlined />}
        type={ButtonEnum.Type.PRIMARY}
        onClick={handleClick}
        danger
      >
        {label}
      </Button>
      <Modal
        title={t("REASON_MODAL_TITLE")}
        visible={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
      >
        <Form form={betCancellationForm} name="basic" onFinish={onFormFinish}>
          <Form.Item
            label={t("REASON")}
            name="reason"
            rules={[{ required: true, message: t("REASON_ERROR") }]}
          >
            <Input />
          </Form.Item>
          {response?.error?.payload.errors.map(
            (error: { errorCode: string }) => (
              <StyledAlert
                key={error.errorCode}
                message={error.errorCode}
                type="error"
                showIcon
              />
            ),
          )}
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading || fakeLoading}
          >
            {t("CONFIRM")}
          </Button>
        </Form>
      </Modal>
    </>
  );
};

export default UserBetCancel;
