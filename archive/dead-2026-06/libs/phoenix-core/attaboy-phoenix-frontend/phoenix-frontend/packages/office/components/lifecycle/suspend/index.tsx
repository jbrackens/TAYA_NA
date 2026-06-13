import { Button as ButtonEnum, Method, useSpy, Id } from "@phoenix-ui/utils";
import React, { useState, useEffect } from "react";
import { useApi } from "../../../services/api/api-service";
import { Button, Modal, Form, Input } from "antd";
import { ToggleLabels } from "../../../types/utils";
import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import FormItem from "antd/lib/form/FormItem";
import { API_USERS_LIFECYCLE_URL } from "../../users/lifecycle/constants";
import { useTranslation } from "i18n";

export type LifecycleSuspendActions = {
  suspend: string;
  unsuspend: string;
};

const DEFAULT_UNSUSPEND_REASON = {
  entity: "OPERATOR_UNSUSPEND",
};

export type LifecycleSuspendProps = {
  id: Id;
  url: string;
  active: boolean;
  visible: boolean;
  labels: ToggleLabels;
  actions?: LifecycleSuspendActions;
  onComplete: Function;
  fakeLoading?: boolean;
  onFail?: Function;
};

const DEFAULT_LIFECYCLE_SUSPEND_ACTIONS: LifecycleSuspendActions = {
  suspend: "freeze",
  unsuspend: "unfreeze",
};

const LifecycleSuspend = ({
  id,
  url,
  active,
  visible,
  labels,
  actions = DEFAULT_LIFECYCLE_SUSPEND_ACTIONS,
  onComplete,
  fakeLoading,
  onFail,
}: LifecycleSuspendProps) => {
  const [submitChange, setSubmitChange] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { spy } = useSpy();
  const [form] = Form.useForm();
  const { t } = useTranslation("page-users-details");

  const [triggerApi, loading, response] = useApi(url, Method.POST);

  const handleClick = () => {
    if (url === API_USERS_LIFECYCLE_URL && !active) {
      setIsModalVisible(true);
    } else {
      setSubmitChange(true);
    }
  };

  const generateDefaultBody = () =>
    url === API_USERS_LIFECYCLE_URL ? DEFAULT_UNSUSPEND_REASON : {};

  const callApi = async (body = {}) => {
    try {
      await triggerApi(body, {
        id,
        action: active ? actions.unsuspend : actions.suspend,
      });
    } catch (err) {
      console.error({ err });
    }
  };

  spy(submitChange, async ({ values }) => {
    if (values) {
      callApi(generateDefaultBody());
      setSubmitChange(false);
    }
  });

  useEffect(() => {
    if (!response.succeeded) return;
    onComplete();
    form.resetFields();
    isModalVisible && setIsModalVisible(false);
  }, [response.succeeded]);

  useEffect(() => {
    if (response.error) {
      onFail && onFail();
    }
  }, [response.error]);

  const onFormFinish = (values: any) => {
    callApi({
      entity: "OPERATOR_SUSPEND",
      details: values.reason,
    });
  };

  useEffect(() => {
    !isModalVisible && form.resetFields();
  }, [isModalVisible]);

  if (visible) {
    return (
      <>
        <Button
          shape={ButtonEnum.Shape.ROUND}
          icon={active ? <LockOutlined /> : <UnlockOutlined />}
          danger={active}
          type={active ? ButtonEnum.Type.PRIMARY : ButtonEnum.Type.DASHED}
          loading={loading || fakeLoading}
          onClick={handleClick}
        >
          {active ? labels.active : labels.inactive}
        </Button>
        <Modal
          title={t("SUSPENSION_REASON")}
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
        >
          <Form onFinish={onFormFinish} form={form}>
            <FormItem
              name="reason"
              label={t("REASON")}
              rules={[{ required: true, message: t("REASON_ERROR") }]}
            >
              <Input />
            </FormItem>
            <FormItem>
              <Button
                htmlType="submit"
                type="primary"
                loading={loading || fakeLoading}
              >
                {t("SUSPEND")}
              </Button>
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  }
  return null;
};

export default LifecycleSuspend;
