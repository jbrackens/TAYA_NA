import React, { useEffect } from "react";
import { useTranslation } from "i18n";
import { StepTitle } from "../index.styled";
import {
  Container,
  ErrorContainer,
  MessageContainer,
  StyledLink,
} from "./index.styled";
import { CoreForm } from "../../../ui/form";
import { useApi } from "../../../../services/api/api-service";
import { Method, useFingerprint } from "@phoenix-ui/utils";
import { Col } from "antd";
import { CoreAlert } from "../../../ui/alert";
import { CodeInput } from "../../../code-input";
import { CoreSpin } from "../../../ui/spin";

type Props = {
  currentStep: number;
  form: any;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
};

const MFA_CODE_LENGTH = 6;

const Step3: React.FC<Props> = ({ currentStep, form, setCurrentStep }) => {
  if (currentStep !== 2) {
    return null;
  }

  const { t } = useTranslation(["register", "common"]);

  const countryPrefix = form.getFieldValue("countryPrefix");
  const phoneNumber = form.getFieldValue("phoneNumber");

  const getMfaCode = useApi("verification/request-by-phone", Method.POST);
  const verifyMfaCode = useApi("verification/check", Method.POST);

  const fingerprintData = useFingerprint();

  const triggerGetMfaCodeApi = () => {
    getMfaCode.triggerApi({
      phoneNumber: `${countryPrefix}${phoneNumber}`,
      deviceFingerprint: fingerprintData,
    });
  };

  useEffect(() => {
    if (fingerprintData) {
      triggerGetMfaCodeApi();
    }
  }, [fingerprintData]);

  const onInputChange = (value: string) => {
    if (value.length === MFA_CODE_LENGTH) {
      verifyMfaCode.triggerApi({
        code: value,
        id: getMfaCode.data.verificationId,
      });
    }
  };

  useEffect(() => {
    if (verifyMfaCode.statusOk) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [verifyMfaCode.statusOk]);

  return (
    <fieldset>
      <StepTitle level={3}>{t("STEP3_TITLE")}</StepTitle>
      <Container>
        <MessageContainer>
          {t("MFA_STEP_MESSAGE", { number: `${countryPrefix}${phoneNumber}` })}
        </MessageContainer>
        <CoreForm.Item
          name="mfa-code"
          rules={[
            {
              min: MFA_CODE_LENGTH,
              message: t("MFA_STEP_ERROR"),
              validateTrigger: "submit",
            },
          ]}
        >
          <CoreSpin spinning={getMfaCode.isLoading || verifyMfaCode.isLoading}>
            <CodeInput
              name="mfa-code"
              inputMode="numeric"
              type="number"
              fields={MFA_CODE_LENGTH}
              onChange={onInputChange}
            />
          </CoreSpin>
        </CoreForm.Item>

        {getMfaCode.error && (
          <ErrorContainer
            justify="center"
            align="middle"
            gutter={[32, 32]}
            role="error"
          >
            <Col span={24}>
              {getMfaCode.error.payload?.errors.map(
                (error: { details: string; errorCode: string }, i: number) => {
                  return (
                    <CoreAlert
                      key={i}
                      message={t(`api-errors:${error.errorCode}`)}
                      type="error"
                      showIcon
                    />
                  );
                },
              )}
            </Col>
          </ErrorContainer>
        )}
        {verifyMfaCode.error && (
          <ErrorContainer
            justify="center"
            align="middle"
            gutter={[32, 32]}
            role="error"
          >
            <Col span={24}>
              {verifyMfaCode.error.payload?.errors.map(
                (error: { details: string; errorCode: string }, i: number) => {
                  return (
                    <CoreAlert
                      key={i}
                      message={t(`api-errors:${error.errorCode}`)}
                      type="error"
                      showIcon
                    />
                  );
                },
              )}
            </Col>
          </ErrorContainer>
        )}

        <StyledLink onClick={triggerGetMfaCodeApi}>
          {t("MFA_SEND_CODE_AGAIN")}
        </StyledLink>
      </Container>
    </fieldset>
  );
};

export { Step3 };
