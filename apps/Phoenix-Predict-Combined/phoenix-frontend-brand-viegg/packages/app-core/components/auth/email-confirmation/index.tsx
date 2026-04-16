import React, { useEffect, useState } from "react";
import { useTranslation } from "i18n";
import { Row, Col } from "antd";
import { CoreAlert } from "../../ui/alert";
import { CoreButton } from "../../ui/button";
import { goApi } from "../../../services/go-api";

type EmailConfirmationComponentProps = {
  emailToken?: string;
};

const EmailConfirmationComponent: React.FC<EmailConfirmationComponentProps> = ({
  emailToken,
}) => {
  const { t } = useTranslation(["email-confirmation"]);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    emailToken ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!emailToken) {
      setStatus("error");
      setErrorMessage(t("MISSING_TOKEN", "No activation token provided."));
      return;
    }

    goApi
      .put(`/account/activate/${emailToken}`)
      .then(() => {
        setStatus("success");
      })
      .catch((err: any) => {
        setStatus("error");
        setErrorMessage(
          err?.response?.data?.error?.message ||
            t("ACTIVATION_FAILED", "Account activation failed. The token may be expired or invalid."),
        );
      });
  }, [emailToken]);

  if (status === "loading") {
    return (
      <Row justify="center" style={{ padding: "48px 0" }}>
        <Col>{t("ACTIVATING", "Activating your account...")}</Col>
      </Row>
    );
  }

  if (status === "success") {
    return (
      <Row justify="center" style={{ padding: "48px 0" }}>
        <Col span={16}>
          <CoreAlert
            message={t("SUCCESS", "Your account has been activated successfully!")}
            type="success"
            showIcon
          />
          <Row justify="center" style={{ marginTop: 16 }}>
            <CoreButton type="primary" href="/sports/home">
              {t("CONTINUE", "Continue to Login")}
            </CoreButton>
          </Row>
        </Col>
      </Row>
    );
  }

  return (
    <Row justify="center" style={{ padding: "48px 0" }}>
      <Col span={16}>
        <CoreAlert message={errorMessage} type="error" showIcon />
      </Col>
    </Row>
  );
};

export { EmailConfirmationComponent };
