import React, { useEffect } from "react";
import { Col, Radio, Space } from "antd";
import { useTranslation } from "i18n";
import { QuestionType } from "..";
import { AcceptButton } from "./index.styled";
import { useApi } from "../../../../services/api/api-service";
import { useState } from "react";
import { ResultModalComponent } from "../../../modals/result-modal";
import { StatusEnum } from "../../../results";
import { CoreModal } from "../../../ui/modal";
import { CoreForm } from "../../../ui/form";
import { CoreButton } from "../../../ui/button";
import { CoreAlert } from "../../../ui/alert";

type IdComplyProps = {
  isVisible: boolean;
  setIsVisible: (arg: boolean) => void;
  data: Array<QuestionType>;
  punterId: string;
};

enum KBAResponsesEnum {
  SUCCESSFUL_REGISTRATION_AND_VERIFICATION = "SUCCESSFUL_REGISTRATION_AND_VERIFICATION",
  KBA_QUESTIONS = "KBA_QUESTIONS",
  REQUIRE_IDPV = "REQUIRE_IDPV",
}

const IdComplyComponent: React.FC<IdComplyProps> = ({
  isVisible,
  setIsVisible,
  data,
  punterId,
}) => {
  const [form] = CoreForm.useForm();
  const { t } = useTranslation(["register"]);
  const {
    triggerApi,
    isLoading,
    error,
    data: idComplyData,
    resetHookState,
    statusOk,
  } = useApi("registration/answer-kba-questions", "POST");
  const [answersToDisplay, setAnswersToDisplay] = useState<Array<QuestionType>>(
    [],
  );
  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 24 },
      xl: { span: 24 },
    },
  };

  const closeModal = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    setAnswersToDisplay(data);
  }, [data]);

  useEffect(() => {
    if (idComplyData?.type === KBAResponsesEnum.KBA_QUESTIONS) {
      form.resetFields();
      setAnswersToDisplay(idComplyData.questions);
      resetHookState();
    }

    if (idComplyData?.type === KBAResponsesEnum.REQUIRE_IDPV) {
      window.location.replace(idComplyData.idpvRedirectUrl);
      resetHookState();
    }
  }, [idComplyData]);

  useEffect(() => {
    if (statusOk && idComplyData?.questions === undefined) {
      closeModal();
    }
  }, [statusOk]);

  const generateChoices = (choices: Array<string>) => (
    <Radio.Group>
      <Space direction="vertical">
        {choices.map((choice) => (
          <Radio value={choice} key={choice}>
            {choice}
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  );

  const sendAnswers = (values: any) => {
    const answers = Object.entries(values).map(([key, value]) => ({
      questionId: key,
      choice: value,
    }));
    triggerApi({ answers, punterId });
    form.resetFields();
  };

  const generateQuestions = () => {
    return answersToDisplay.map((question) => (
      <CoreForm.Item
        key={question.questionId}
        label={t(question.text)}
        name={question.questionId}
        rules={[
          {
            required: true,
            message: t("ANSWER_REQUIRED"),
          },
        ]}
      >
        {generateChoices(question.choices)}
      </CoreForm.Item>
    ));
  };

  return (
    <>
      <CoreModal
        title={t("ID_COMPLY_TITLE")}
        centered
        visible={isVisible}
        onOk={() => closeModal()}
        onCancel={() => closeModal()}
        footer={null}
        maskClosable={false}
      >
        <CoreForm
          {...formItemLayout}
          name="idComplyForm"
          onFinish={sendAnswers}
          form={form}
        >
          {generateQuestions()}
          <Col span={24}>
            {error && <CoreAlert message={"error"} type="error" showIcon />}
          </Col>
          <Col span={24}>
            <AcceptButton
              type="primary"
              size="large"
              block
              onClick={() => form.submit()}
              loading={isLoading}
            >
              {t("SEND_ANSWERS")}
            </AcceptButton>
          </Col>
          <Col span={24}>
            <CoreButton
              type="default"
              size="large"
              block
              onClick={() => closeModal()}
            >
              {t("CANCEL")}
            </CoreButton>
          </Col>
        </CoreForm>
      </CoreModal>
      <ResultModalComponent
        status={StatusEnum.SUCCESS}
        title={t("MODAL_TITLE_SUCCESS")}
        subTitle={t("MODAL_MESSAGE_SUCCESS")}
        okText={t("OK")}
        onOk={resetHookState}
        isVisible={
          idComplyData?.type ===
          KBAResponsesEnum.SUCCESSFUL_REGISTRATION_AND_VERIFICATION
        }
      />
    </>
  );
};

export { IdComplyComponent };
