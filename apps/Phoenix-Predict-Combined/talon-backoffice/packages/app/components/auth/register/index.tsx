import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Steps } from "antd";
import { useTranslation } from "i18n";
import {
  selectRegisterModalVisible,
  hideRegisterModal,
  showAuthModal,
} from "../../../lib/slices/authSlice";
import { useApi } from "../../../services/api/api-service";
import { Step1 } from "./step1";
import { Step2 } from "./step2";
import { Step3 } from "./step3";
import { Step4 } from "./step4";
import { BottomMessageNoLeftMargin } from "../../../components/modals/index.styled";
import {
  LoginInfoContainer,
  NextButton,
  BackButton,
  StyledSteps,
} from "./index.styled";
import { IdComplyComponent } from "./id-comply";
import { ErrorComponent } from "../../errors";
import { CoreButton } from "../../ui/button";
import { CoreModal } from "../../ui/modal";
import { CoreForm } from "../../ui/form";
import { selectCountryCode } from "../../../lib/slices/siteSettingsSlice";
import { useFingerprint, useQueryParams } from "@phoenix-ui/utils";

const TOTAL_STEPS = 4;

const { Step } = Steps;

type FormValues = {
  name: {
    title: string | undefined;
    firstName: string | undefined;
    lastName: string | undefined;
  };
  username: string | undefined;
  email: string | undefined;
  phoneNumber: string | undefined;
  countryPrefix: string | undefined;
  password: string | undefined;
  address: {
    addressLine: string | undefined;
    city: string | undefined;
    state: string | undefined;
    zipcode: string | undefined;
    country: string | undefined;
  };
  dateOfBirth: {
    day: number | undefined;
    month: number | undefined;
    year: number | undefined;
  };
  ssn: string | undefined;
  referralCode: string | undefined;
};

enum ResultEnum {
  IDPV = "REQUIRE_IDPV",
  KBA = "KBA_QUESTIONS",
}

type IdpvRegisterPayload = {
  type: ResultEnum.IDPV;
  idpvRedirectUrl: string;
};

export type QuestionType = {
  text: string;
  questionId: string;
  choices: Array<string>;
};

type KbaRegisterPayload = {
  type: ResultEnum.KBA;
  questions: Array<QuestionType>;
  punterId: string;
};

type RegisterPayload = IdpvRegisterPayload | KbaRegisterPayload;

const RegisterComponent: React.FC = () => {
  const { t } = useTranslation(["register"]);
  const dispatch = useDispatch();
  const [form] = CoreForm.useForm();
  const [formValues, setFormValues] = useState<FormValues>({} as FormValues);
  const [formFinished, setFormFinished] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const isRegisterModalVisible = useSelector(selectRegisterModalVisible);
  const [isIdComplyModalVisible, setIsIdComplyModalVisible] = useState(false);
  const [idComplyData, setIdComplyData] = useState<Array<QuestionType>>([]);
  const [idComplyPUnterId, setidComplyPUnterId] = useState("");
  const queryParams = useQueryParams();

  const {
    triggerApi,
    isLoading,
    data,
    error,
    resetHookState,
  } = useApi<RegisterPayload>("/registration-closed", "POST");

  const fingerprintData = useFingerprint();

  const dispatchHideRegisterModal = () => {
    dispatch(hideRegisterModal());
    setCurrentStep(0);
    form.resetFields();
    resetHookState();
    queryParams.remove("showModal");
  };

  const onFinish = useCallback(() => {
    setFormValues(form.getFieldsValue(true));
    setFormFinished(true);
  }, [form]);

  useEffect(() => {
    if (data) {
      dispatchHideRegisterModal();
      if (data.type === ResultEnum.KBA) {
        setIdComplyData(data.questions);
        setidComplyPUnterId(data.punterId);
        setIsIdComplyModalVisible(true);
        return;
      }

      if (data.type === ResultEnum.IDPV) {
        window.location.replace(data.idpvRedirectUrl);
      }
    }
  }, [data]);

  useEffect(() => {
    if (formFinished) {
      const proceedSubmitRequest = async () => {
        const {
          name,
          username,
          email,
          phoneNumber,
          countryPrefix,
          password,
          address,
          dateOfBirth,
          ssn,
          referralCode,
        } = formValues;

        triggerApi(
          {
            name,
            username,
            email,
            phoneNumber: `${countryPrefix}${phoneNumber}`,
            password,
            address,
            dateOfBirth,
            ssn,
            referralCode,
            deviceFingerprint: fingerprintData,
          },
          undefined,
          {
            "X-Dev-Domain": `${window.location.protocol}//${window.location.hostname}:${window.location.port}`,
          },
        );
      };
      proceedSubmitRequest();
      setFormFinished(false);
    }
  }, [formFinished]);

  const handleNext = async () => {
    await form.validateFields();
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 24 },
      xl: { span: 24 },
    },
  };

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  const showLoginModal = () => {
    dispatch(hideRegisterModal());
    dispatch(showAuthModal());
  };

  const defaultCountryCode = useSelector(selectCountryCode);

  return (
    <>
      <CoreModal
        title={t("TITLE")}
        centered
        visible={isRegisterModalVisible}
        onOk={dispatchHideRegisterModal}
        onCancel={dispatchHideRegisterModal}
        footer={null}
        maskClosable={false}
      >
        <CoreForm
          {...formItemLayout}
          name="registerForm"
          onFinish={onFinish}
          form={form}
          colon={false}
          requiredMark={true}
          initialValues={{
            address: { country: "US" },
            countryPrefix: defaultCountryCode,
            terms: [],
          }}
        >
          <StyledSteps
            current={currentStep}
            className="ant-steps-label-horizontal ant-steps-horizontal"
          >
            <Step />
            <Step />
            <Step />
            <Step />
          </StyledSteps>

          <Step1 currentStep={currentStep} form={form} />
          <Step2 currentStep={currentStep} form={form} />
          <Step3
            currentStep={currentStep}
            form={form}
            setCurrentStep={setCurrentStep}
          />
          <Step4 currentStep={currentStep} form={form} />

          {error && (
            <Row
              justify="center"
              align="middle"
              gutter={[32, 32]}
              role="error"
            >
              <Col span={24}>
                <ErrorComponent
                  errors={error.payload.errors}
                  translationKey={"api-errors"}
                />
              </Col>
            </Row>
          )}

          <Row>
            <Col span={24}>
              {currentStep !== 2 && (
                <NextButton
                  type="primary"
                  size="large"
                  block
                  onClick={isLastStep ? () => form.submit() : handleNext}
                  loading={isLoading}
                  role={isLoading ? "loading" : ""}
                >
                  {isLastStep ? t("SIGN_UP") : t("NEXT")}
                </NextButton>
              )}
            </Col>
            <Col span={24}>
              {currentStep > 0 && (
                <BackButton
                  type="default"
                  size="large"
                  block
                  onClick={handleBack}
                >
                  {currentStep === 2 ? t("CHANGE_PHONE_NUMBER") : t("BACK")}
                </BackButton>
              )}
            </Col>
            <Col span={24}>
              {currentStep === 0 && (
                <LoginInfoContainer>{t("LOGIN_INFO")}</LoginInfoContainer>
              )}
            </Col>
            <Col span={24}>
              {currentStep === 0 && (
                <CoreButton
                  type="default"
                  size="large"
                  block
                  onClick={showLoginModal}
                >
                  {t("LOGIN_NOW")}
                </CoreButton>
              )}
            </Col>
          </Row>
          <BottomMessageNoLeftMargin>{t("RG_MESSAGE")}</BottomMessageNoLeftMargin>
        </CoreForm>
      </CoreModal>
      <IdComplyComponent
        isVisible={isIdComplyModalVisible}
        setIsVisible={setIsIdComplyModalVisible}
        data={idComplyData}
        punterId={idComplyPUnterId}
      />
    </>
  );
};

export { RegisterComponent };
