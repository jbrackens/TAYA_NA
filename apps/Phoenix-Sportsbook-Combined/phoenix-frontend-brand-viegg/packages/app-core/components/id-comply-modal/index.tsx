import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "i18n";
import { ModalTypeEnum } from "../layout";
import { CoreModal } from "../ui/modal";
import { CoreButton } from "../ui/button";
import { CoreAlert } from "../ui/alert";
import { Row, Col } from "antd";
import { useStartIdpv, useCheckIdpvStatus } from "../../services/go-api";
import type { AppError } from "../../services/go-api";

type Props = {
  punterId?: string;
  showModal?: ModalTypeEnum;
};

const IdComplyModalComponent: React.FC<Props> = ({ showModal }) => {
  const { t } = useTranslation(["register"]);
  const startIdpvMutation = useStartIdpv();
  const checkStatusMutation = useCheckIdpvStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (showModal === ModalTypeEnum.IDCOMPLY) {
      setIsVisible(true);
    }
  }, [showModal]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleStartIdpv = () => {
    startIdpvMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.idpvRedirectUrl) {
          window.open(data.idpvRedirectUrl, "_blank");
        }
        setPolling(true);
        intervalRef.current = setInterval(() => {
          checkStatusMutation.mutate(undefined, {
            onSuccess: (statusData) => {
              if (
                statusData.status === "approved" ||
                statusData.status === "completed"
              ) {
                setPolling(false);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                setIsVisible(false);
              }
            },
          });
        }, 5000);
      },
    });
  };

  const handleClose = () => {
    setPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsVisible(false);
  };

  const startError = startIdpvMutation.error as AppError | undefined;

  return (
    <CoreModal
      title={t("IDPV_TITLE", "Identity Verification")}
      centered
      visible={isVisible}
      onCancel={handleClose}
      footer={null}
      maskClosable={false}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <p>
            {t(
              "IDPV_INFO",
              "Please complete the identity verification process to continue.",
            )}
          </p>
        </Col>

        {!polling ? (
          <Col span={24}>
            <CoreButton
              type="primary"
              size="large"
              block
              onClick={handleStartIdpv}
              loading={startIdpvMutation.isLoading}
            >
              {t("IDPV_START", "Start Verification")}
            </CoreButton>
          </Col>
        ) : (
          <Col span={24}>
            <CoreAlert
              message={t(
                "IDPV_POLLING",
                "Verification in progress. Please complete the process in the new tab.",
              )}
              type="info"
              showIcon
            />
          </Col>
        )}

        {startError && (
          <Col span={24}>
            <CoreAlert
              message={t(
                "IDPV_ERROR",
                "Failed to start verification. Please try again.",
              )}
              type="error"
              showIcon
            />
          </Col>
        )}
      </Row>
    </CoreModal>
  );
};

export { IdComplyModalComponent };
