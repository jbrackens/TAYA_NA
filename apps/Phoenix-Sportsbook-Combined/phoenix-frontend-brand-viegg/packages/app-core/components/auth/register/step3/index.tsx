import React, { useState } from "react";
import { useTranslation } from "i18n";
import { CoreInput } from "../../../ui/input";
import { CoreButton } from "../../../ui/button";
import { CoreAlert } from "../../../ui/alert";
import { Row, Col } from "antd";
import {
  useRequestVerificationByPhone,
  useCheckVerification,
} from "../../../../services/go-api";
import type { AppError } from "../../../../services/go-api";

type Props = {
  currentStep: number;
  form: any;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
};

const Step3: React.FC<Props> = ({ currentStep, form, setCurrentStep }) => {
  const { t } = useTranslation(["register"]);
  const [verificationId, setVerificationId] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const requestCodeMutation = useRequestVerificationByPhone();
  const checkCodeMutation = useCheckVerification();

  if (currentStep !== 2) {
    return null;
  }

  const phoneNumber = form.getFieldValue("phoneNumber") || "";
  const countryPrefix = form.getFieldValue("countryPrefix") || "";

  const handleSendCode = () => {
    requestCodeMutation.mutate(undefined, {
      onSuccess: (data) => {
        setVerificationId(data.verificationId);
        setCodeSent(true);
      },
    });
  };

  const handleVerify = () => {
    checkCodeMutation.mutate(
      {
        verification_id: verificationId,
        verification_code: verificationCode,
      },
      {
        onSuccess: () => {
          setCurrentStep(currentStep + 1);
        },
      },
    );
  };

  const requestError = requestCodeMutation.error as AppError | undefined;
  const checkError = checkCodeMutation.error as AppError | undefined;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <p>
            {t("PHONE_VERIFICATION_INFO", "We need to verify your phone number.")}
          </p>
          <p>
            {countryPrefix} {phoneNumber}
          </p>
        </Col>

        {!codeSent ? (
          <Col span={24}>
            <CoreButton
              type="primary"
              size="large"
              block
              onClick={handleSendCode}
              loading={requestCodeMutation.isLoading}
            >
              {t("SEND_CODE", "Send Code")}
            </CoreButton>
          </Col>
        ) : (
          <>
            <Col span={24}>
              <CoreInput
                id="verificationCode"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode((e.currentTarget as HTMLInputElement).value)
                }
                label={t("VERIFICATION_CODE", "Verification Code")}
                spaceUnder
              />
            </Col>
            <Col span={24}>
              <CoreButton
                type="primary"
                size="large"
                block
                onClick={handleVerify}
                loading={checkCodeMutation.isLoading}
              >
                {t("VERIFY", "Verify")}
              </CoreButton>
            </Col>
          </>
        )}

        {requestError && (
          <Col span={24}>
            <CoreAlert
              message={t("SEND_CODE_ERROR", "Failed to send verification code. Please try again.")}
              type="error"
              showIcon
            />
          </Col>
        )}

        {checkError && (
          <Col span={24}>
            <CoreAlert
              message={t("VERIFY_CODE_ERROR", "Invalid verification code. Please try again.")}
              type="error"
              showIcon
            />
          </Col>
        )}
      </Row>
    </div>
  );
};

export { Step3 };
