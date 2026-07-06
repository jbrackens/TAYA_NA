import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Steps } from "antd";
import { useTranslation } from "i18n";
import {
  selectRegisterModalVisible,
  hideRegisterModal,
  showAuthModal,
} from "../../../lib/slices/authSlice";
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
import { ErrorComponent } from "../../errors";
import { CoreButton } from "../../ui/button";
import { CoreModal } from "../../ui/modal";
import { CoreForm } from "../../ui/form";
import { selectCountryCode } from "../../../lib/slices/siteSettingsSlice";
import { useQueryParams } from "@phoenix-ui/utils";
import { useRegister } from "../../../services/go-api";
import type { GoRegisterRequest } from "../../../services/go-api";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";
import { IdComplyComponent } from "./id-comply";

// Step1: username, name, email, password
// Step2: DOB, phone
// Step3: phone verification
// Step4: address, terms checkboxes
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

export type QuestionType = {
  text: string;
  questionId: string;
  choices: Array<string>;
};

const RegisterComponent: React.FC = () => {
  const { t } = useTranslation(["register"]);
  const dispatch = useDispatch();
  const [form] = CoreForm.useForm();
  const [formValues, setFormValues] = useState<FormValues>({} as FormValues);
  const [formFinished, setFormFinished] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const isRegisterModalVisible = useSelector(selectRegisterModalVisible);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [kbaVisible, setKbaVisible] = useState(false);
  const [kbaQuestions, setKbaQuestions] = useState<Array<QuestionType>>([]);
  const queryParams = useQueryParams();

  const registerMutation = useRegister();

  const dispatchHideRegisterModal = () => {
    dispatch(hideRegisterModal());
    setCurrentStep(0);
    form.resetFields();
    registerMutation.reset();
    queryParams.remove("showModal");
  };

  const onFinish = useCallback(() => {
    setFormValues(form.getFieldsValue(true));
    setFormFinished(true);
  }, [form]);

  useEffect(() => {
    if (formFinished) {
      const {
        name,
        username,
        email,
        password,
        dateOfBirth,
        address,
      } = formValues;

      const dob =
        dateOfBirth?.year && dateOfBirth?.month && dateOfBirth?.day
          ? `${dateOfBirth.year}-${String(dateOfBirth.month).padStart(2, "0")}-${String(dateOfBirth.day).padStart(2, "0")}`
          : "";

      const request: GoRegisterRequest = {
        email: email || "",
        username: username || "",
        password: password || "",
        first_name: name?.firstName || "",
        last_name: name?.lastName || "",
        date_of_birth: dob,
        country: address?.country || "US",
      };

      registerMutation.mutate(request, {
        onSuccess: (data: any) => {
          if (data?.questions && data.questions.length > 0) {
            setKbaQuestions(
              data.questions.map((q: any) => ({
                text: q.question_text || q.text,
                questionId: q.question_id || q.questionId,
                choices: q.choices || [],
              })),
            );
            setKbaVisible(true);
          } else {
            dispatchHideRegisterModal();
            setIsSuccessVisible(true);
          }
        },
      });
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

  const registrationError = registerMutation.error as any;

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

          {registrationError && (
            <Row
              justify="center"
              align="middle"
              gutter={[32, 32]}
              role="error"
            >
              <Col span={24}>
                <ErrorComponent
                  errors={
                    registrationError?.payload?.errors || [
                      { errorCode: "unexpectedError", details: "" },
                    ]
                  }
                  translationKey={"api-errors"}
                />
              </Col>
            </Row>
          )}

          <Row>
            <Col span={24}>
              <NextButton
                type="primary"
                size="large"
                block
                onClick={isLastStep ? () => form.submit() : handleNext}
                loading={registerMutation.isLoading}
                role={registerMutation.isLoading ? "loading" : ""}
              >
                {isLastStep ? t("SIGN_UP") : t("NEXT")}
              </NextButton>
            </Col>
            <Col span={24}>
              {currentStep > 0 && (
                <BackButton
                  type="default"
                  size="large"
                  block
                  onClick={handleBack}
                >
                  {t("BACK")}
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
        isVisible={kbaVisible}
        setIsVisible={(visible: boolean) => {
          setKbaVisible(visible);
          if (!visible) {
            dispatchHideRegisterModal();
            setIsSuccessVisible(true);
          }
        }}
        data={kbaQuestions}
      />
      <ResultModalComponent
        status={StatusEnum.SUCCESS}
        title={t("MODAL_TITLE_SUCCESS")}
        subTitle={t("MODAL_MESSAGE_SUCCESS")}
        okText={t("LOGIN_NOW")}
        onOk={() => {
          setIsSuccessVisible(false);
          dispatch(showAuthModal());
        }}
        isVisible={isSuccessVisible}
      />
    </>
  );
};

export { RegisterComponent };
