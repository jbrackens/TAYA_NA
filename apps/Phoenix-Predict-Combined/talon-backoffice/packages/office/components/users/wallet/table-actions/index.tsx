import React, { FC } from "react";
import { Button, Form, Input, Modal } from "antd";
import { ActionButtonContainer, CancelButton } from "./index.styled";
import { useApi } from "../../../../services/api/api-service";
import { Id, Method, useSpy } from "@phoenix-ui/utils";
import { useEffect } from "react";
import { useState } from "react";
import { useTranslation } from "i18n";
import FormItem from "antd/lib/form/FormItem";

type TableActionsProps = {
  punterId: Id;
  transactionId: string;
  triggerWalletApi: Function;
  onActioned?: (transactionId: string) => void;
};

export const TableActions: FC<TableActionsProps> = ({
  transactionId,
  triggerWalletApi,
  onActioned,
}) => {
  const { t } = useTranslation("page-users-details");
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [isAcceptModalVisible, setIsAcceptModalVisible] = useState(false);
  const [fakeLoading, setFakeLoading] = useState(false);
  const [
    triggerConfirmApi,
    confirmApiLoading,
    confirmApiStatusOk,
    ,
    resetConfirmApi,
  ] = useApi(
    `admin/payments/transactions/${transactionId}/approve`,
    Method.POST,
  );
  const [
    triggerRejectApi,
    rejectApiLoading,
    rejectApiStatusOk,
    ,
    resetRejectApi,
  ] = useApi(
    `admin/payments/transactions/${transactionId}/decline`,
    Method.POST,
  );

  const [form] = Form.useForm();

  const callTriggerWallet = () => {
    setTimeout(() => {
      triggerWalletApi();
      setFakeLoading(false);
    }, 1500);
  };

  const { spy } = useSpy();

  const resetHook = (values: any) => {
    if (!values.prevValues || values.values != values.prevValues) {
      resetConfirmApi();
      resetRejectApi();
      onActioned?.(transactionId);
      callTriggerWallet();
    }
  };

  spy(confirmApiStatusOk?.succeeded, resetHook);
  spy(rejectApiStatusOk?.succeeded, resetHook);

  useEffect(() => {
    if (confirmApiStatusOk?.error) {
      setFakeLoading(false);
    }
  }, [confirmApiStatusOk]);

  useEffect(() => {
    if (rejectApiStatusOk?.error) {
      setFakeLoading(false);
    }
  }, [rejectApiStatusOk]);

  useEffect(() => {
    if (!isRejectModalVisible) {
      form.resetFields();
    }
  }, [isRejectModalVisible]);

  const onFormFinish = (values: any) => {
    setFakeLoading(true);
    setIsRejectModalVisible(false);
    triggerRejectApi({
      reason: values.reason,
    });
  };

  const onAcceptButtonClick = () => {
    setIsAcceptModalVisible(true);
  };

  const onAcceptanceFormFinish = () => {
    setFakeLoading(true);
    triggerConfirmApi();
    setIsAcceptModalVisible(false);
  };

  return (
    <>
      <ActionButtonContainer>
        <Button
          onClick={onAcceptButtonClick}
          shape="round"
          type="primary"
          loading={confirmApiLoading || fakeLoading}
          disabled={rejectApiLoading}
        >
          {t("ACCEPT")}
        </Button>

        <Button
          onClick={() => setIsRejectModalVisible(true)}
          shape={"round"}
          type="primary"
          danger
          loading={rejectApiLoading || fakeLoading}
          disabled={confirmApiLoading}
        >
          {t("REJECT")}
        </Button>
      </ActionButtonContainer>
      <Modal
        title={t("REJECTION_MODAL_TITLE")}
        visible={isRejectModalVisible}
        onCancel={() => setIsRejectModalVisible(false)}
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
            <Button htmlType="submit" type="primary" loading={rejectApiLoading}>
              {t("CONFIRM")}
            </Button>
          </FormItem>
        </Form>
      </Modal>
      <Modal
        title={t("ACCEPTANCE_MODAL_TITLE")}
        visible={isAcceptModalVisible}
        onCancel={() => setIsAcceptModalVisible(false)}
        footer={null}
      >
        <Form onFinish={onAcceptanceFormFinish}>
          <FormItem>
            <Button htmlType="submit" type="primary">
              {t("ACCEPT_TRANSACTION")}
            </Button>
            <CancelButton
              htmlType="button"
              type="default"
              onClick={() => setIsAcceptModalVisible(false)}
            >
              {t("CANCEL")}
            </CancelButton>
          </FormItem>
        </Form>
      </Modal>
    </>
  );
};
