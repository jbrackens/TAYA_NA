import React, { useState } from "react";
import { useTranslation } from "i18n";
import { useRouter } from "next/router";
import { Row, Col } from "antd";
import { CoreButton } from "../../ui/button";
import { CoreModal } from "../../ui/modal";
import { CoreInput } from "../../ui/input";
import { CoreAlert } from "../../ui/alert";
import { LimitForm } from "./limit-form";
import { useCoolOff } from "../../../services/go-api/compliance/compliance-hooks";

export enum LimitUnitEnum {
  NANOSECONDS = "NANOSECONDS",
  MICROSECONDS = "MICROSECONDS",
  MILLISECONDS = "MILLISECONDS",
  SECONDS = "SECONDS",
  MINUTES = "MINUTES",
  HOURS = "HOURS",
  DAYS = "DAYS",
}

type DepositLimitsProps = {
  depositLimits?: any;
  stakeLimits?: any;
  sessionLimits?: any;
  isUserDataLoading?: boolean;
};

const DepositLimitsComponent: React.FC<DepositLimitsProps> = ({
  depositLimits,
  stakeLimits,
  sessionLimits,
  isUserDataLoading = false,
}) => {
  const { t } = useTranslation(["deposit-limits", "responsible-gaming"]);
  const router = useRouter();
  const [isCoolOffModalVisible, setIsCoolOffModalVisible] = useState(false);
  const [coolOffDays, setCoolOffDays] = useState<number>(3);
  const coolOffMutation = useCoolOff();

  const handleCoolOff = () => {
    coolOffMutation.mutate(
      { duration_days: Math.max(3, coolOffDays) },
      {
        onSuccess: () => {
          setIsCoolOffModalVisible(false);
          coolOffMutation.reset();
        },
      },
    );
  };

  return (
    <>
      <LimitForm
        title={t("DEPOSIT_LIMITS")}
        url="punters/deposit-limits"
        values={depositLimits}
        isUserDataLoading={isUserDataLoading}
      />

      <LimitForm
        title={t("STAKE_LIMITS")}
        url="punters/stake-limits"
        values={stakeLimits}
        isUserDataLoading={isUserDataLoading}
      />

      <LimitForm
        title={t("SESSION_LIMITS")}
        url="punters/session-limits"
        values={sessionLimits}
        isUserDataLoading={isUserDataLoading}
      />

      <Row style={{ marginTop: 24 }} gutter={16}>
        <Col span={12}>
          <CoreButton
            type="primary"
            size="large"
            block
            onClick={() => setIsCoolOffModalVisible(true)}
          >
            {t("responsible-gaming:COOL_OFF")}
          </CoreButton>
        </Col>
        <Col span={12}>
          <CoreButton
            size="large"
            block
            onClick={() =>
              router.push("/account/responsible-gaming/self-exclude")
            }
          >
            {t("responsible-gaming:SELF_EXCLUDE")}
          </CoreButton>
        </Col>
      </Row>

      <CoreModal
        title={t("responsible-gaming:COOL_OFF")}
        centered
        visible={isCoolOffModalVisible}
        onCancel={() => {
          setIsCoolOffModalVisible(false);
          coolOffMutation.reset();
        }}
        footer={null}
        maskClosable={false}
      >
        <p>{t("responsible-gaming:COOL_OFF_DESCRIPTION")}</p>
        <CoreInput
          type="number"
          value={String(coolOffDays)}
          onChange={(e: any) =>
            setCoolOffDays(parseInt(e.target?.value || e, 10) || 3)
          }
          label={t("responsible-gaming:COOL_OFF_DAYS")}
          spaceUnder
        />
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          {t("responsible-gaming:COOL_OFF_MIN_DAYS")}
        </p>
        {coolOffMutation.error && (
          <CoreAlert
            message={t("deposit-limits:API_ERROR")}
            type="error"
            showIcon
          />
        )}
        <CoreButton
          type="primary"
          size="large"
          block
          loading={coolOffMutation.isLoading}
          onClick={handleCoolOff}
          disabled={coolOffDays < 3}
        >
          {t("responsible-gaming:CONFIRM")}
        </CoreButton>
      </CoreModal>
    </>
  );
};

export { DepositLimitsComponent };
