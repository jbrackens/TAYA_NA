import React from "react";
import { Col } from "antd";
import { useTranslation } from "i18n";
import {
  ErrorContainer,
  MessageContainer,
  ModalTitle,
} from ".././index.styled";
import { useApi } from "../../../../services/api/api-service";
import { useEffect } from "react";
import { useLogout } from "../../../../hooks/useLogout";
import { ErrorComponent } from "../../../errors";
import { CoreModal } from "../../../ui/modal";
import { CoreForm } from "../../../ui/form";
import { CoreButton } from "../../../ui/button";

type DeletionModalComponentProps = {
  isDeletionModalVisible: boolean;
  setIsDeletionModalVisible: (isVisible: boolean) => void;
};

const DeletionModalComponent: React.FC<DeletionModalComponentProps> = ({
  isDeletionModalVisible,
  setIsDeletionModalVisible,
}) => {
  const { t } = useTranslation(["personal-details"]);

  const deletionApi = useApi("punters/delete", "POST");
  const { logOutWithoutApiCall } = useLogout();
  const [form] = CoreForm.useForm();

  const deletionFormOnFinish = () => {
    deletionApi.triggerApi();
  };

  useEffect(() => {
    if (deletionApi.statusOk) {
      logOutWithoutApiCall();
    }
  }, [deletionApi.statusOk]);

  useEffect(() => {
    if (!isDeletionModalVisible) {
      deletionApi.resetHookState();
    }
  }, [isDeletionModalVisible]);

  return (
    <>
      <CoreModal
        centered
        visible={isDeletionModalVisible}
        onCancel={() => setIsDeletionModalVisible(false)}
        onOk={() => setIsDeletionModalVisible(false)}
        maskClosable={false}
        footer={null}
        forceRender
        width={375}
      >
        <CoreForm
          layout="vertical"
          onFinish={deletionFormOnFinish}
          role={"editForm"}
          form={form}
        >
          <ModalTitle>{t("ACCOUNT_CLOSURE")}</ModalTitle>
          <MessageContainer>{t("CLOSURE_MESSAGE")}</MessageContainer>
          <CoreForm.Item>
            <CoreButton
              htmlType="submit"
              size="large"
              block
              danger
              loading={deletionApi.isLoading}
            >
              {t("CLOSE")}
            </CoreButton>
          </CoreForm.Item>
          <CoreForm.Item>
            <CoreButton
              type="default"
              size="large"
              onClick={() => setIsDeletionModalVisible(false)}
              block
            >
              {t("CANCEL")}
            </CoreButton>
          </CoreForm.Item>
          {deletionApi.error && (
            <Col span={24}>
              <ErrorContainer
                justify="center"
                align="middle"
                gutter={[32, 32]}
                role="error"
              >
                <ErrorComponent
                  errors={deletionApi.error.payload.errors}
                  translationKey={"api-errors"}
                />
              </ErrorContainer>
            </Col>
          )}
        </CoreForm>
      </CoreModal>
    </>
  );
};

export { DeletionModalComponent };
