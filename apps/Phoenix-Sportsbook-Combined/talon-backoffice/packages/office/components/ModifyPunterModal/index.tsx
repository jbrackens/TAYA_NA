import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Descriptions, Spin } from "antd";
import { CustomFormItem, ErrorMessageDiv } from "./index.styled";
import { ModalFields } from "./modalFields";
import {
  createPayload,
  compareObject,
  formLabels,
  getEndpoint,
  getCustomFieldDetails,
  isFieldLayoutHorizontal,
} from "./editModalUtils";
import { useApi } from "./../../services/api/api-service";
import { Method } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";

type ModalProps = {
  fieldName: string;
  defaultValue: any;
  punterId: number | string;
  closeModal?: () => void;
  onComplete?: (success: boolean) => void;
};

export const ModifyPunterModal = ({
  fieldName,
  defaultValue,
  punterId,
  closeModal,
  onComplete,
}: ModalProps) => {
  const { t } = useTranslation("edit-modal");

  const [modalStatus, setModalStatus] = useState<string>("first");
  const [newValue, setNewValue] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<boolean>(false);

  const [triggerApi, apiLoading, apiResponse, , resetHookState] = useApi(
    `admin/punters/${punterId}/detail/${getEndpoint(fieldName)}`,
    Method.POST,
  );
  const { succeeded: apiSuccess, error: apiError } = apiResponse;

  useEffect(() => {
    if (apiSuccess || apiError) {
      closeModal && closeModal();
      onComplete && onComplete(apiSuccess ? true : false);
    }
  }, [apiSuccess]);

  useEffect(() => {
    setLoading(apiLoading);
  }, [apiLoading]);

  const continueClicked = (e: {}) => {
    setNewValue(e);
    if (compareObject(e, defaultValue)) {
      setFormError(true);
    } else {
      setModalStatus("confirm");
      setFormError(false);
    }
  };

  const closingModal = () => {
    closeModal && closeModal();
  };

  const resetModal = () => {
    resetHookState();
    setModalStatus("first");
    setNewValue({});
    setLoading(false);
  };

  const updatePunterDetails = () => {
    const payload = createPayload(fieldName, newValue);
    getEndpoint(fieldName) && triggerApi(payload);
  };

  return (
    <Modal
      title={`${t("MODAL_TITLE")} ${formLabels(fieldName)}`}
      visible={fieldName && fieldName?.length > 0 ? true : false}
      onCancel={closingModal}
      footer={null}
      destroyOnClose
      maskClosable={false}
      closable={!loading}
      width={700}
      afterClose={resetModal}
    >
      {modalStatus === "first" && (
        <Spin tip={t("LOADING")} spinning={loading}>
          <Form
            onFinish={continueClicked}
            layout="vertical"
            initialValues={defaultValue}
          >
            <ModalFields
              fields={defaultValue}
              fieldChanged={() => setFormError(false)}
              customFieldDetails={getCustomFieldDetails(fieldName)}
              horizontalLayout={isFieldLayoutHorizontal(fieldName)}
            />
            <CustomFormItem>
              {formError && (
                <ErrorMessageDiv>{t("ERROR_CHANGE_SOMETHING")}</ErrorMessageDiv>
              )}
              <Button htmlType="submit" type="default">
                {t("CONTINUE")}
              </Button>
            </CustomFormItem>
          </Form>
        </Spin>
      )}
      {modalStatus === "confirm" && (
        <Spin tip={t("LOADING")} spinning={loading}>
          <Form onFinish={updatePunterDetails} layout="vertical">
            <Descriptions
              bordered
              column={2}
              title="Please confirm the details"
            >
              {Object.keys(defaultValue).map((val: string, index: number) => (
                <React.Fragment key={index}>
                  <Descriptions.Item label={`Previous ${val}`}>
                    {String(defaultValue[val]).length > 0
                      ? defaultValue[val]
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label={`New ${val}`}>
                    {newValue[val]}
                  </Descriptions.Item>
                </React.Fragment>
              ))}
            </Descriptions>
            <CustomFormItem>
              <Button type="default" onClick={() => setModalStatus("first")}>
                {t("BACK")}
              </Button>
              <Button htmlType="submit" type="primary">
                {t("CONFIRM")}
              </Button>
            </CustomFormItem>
          </Form>
        </Spin>
      )}
    </Modal>
  );
};

ModifyPunterModal.defaultProps = {
  fieldName: "",
  defaultValue: {},
  punterId: "",
  closeModal: () => {},
  onComplete: () => {},
};
