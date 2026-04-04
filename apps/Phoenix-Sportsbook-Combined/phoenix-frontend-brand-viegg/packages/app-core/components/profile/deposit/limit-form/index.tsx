import React, { useState } from "react";
import { useTranslation } from "i18n";
import { Row, Col } from "antd";
import { CoreForm } from "../../../ui/form";
import { CoreInput } from "../../../ui/input";
import { CoreButton } from "../../../ui/button";
import { CoreAlert } from "../../../ui/alert";
import {
  useSetDepositLimits,
  useSetStakeLimits,
  useSetSessionLimits,
} from "../../../../services/go-api/compliance/compliance-hooks";

type LimitFormProps = {
  title: string;
  url: string;
  values: any;
  isUserDataLoading: boolean;
};

const LimitForm: React.FC<LimitFormProps> = ({
  title,
  url,
  values,
  isUserDataLoading,
}) => {
  const { t } = useTranslation(["deposit-limits"]);
  const [form] = CoreForm.useForm();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const depositMutation = useSetDepositLimits();
  const stakeMutation = useSetStakeLimits();
  const sessionMutation = useSetSessionLimits();

  const getMutation = () => {
    if (url.includes("deposit-limits")) return depositMutation;
    if (url.includes("stake-limits")) return stakeMutation;
    return sessionMutation;
  };

  const mutation = getMutation();

  const onFinish = (formValues: any) => {
    setSuccessMsg(null);
    mutation.reset();

    const daily = formValues.daily_limit
      ? Number(formValues.daily_limit)
      : undefined;
    const weekly = formValues.weekly_limit
      ? Number(formValues.weekly_limit)
      : undefined;
    const monthly = formValues.monthly_limit
      ? Number(formValues.monthly_limit)
      : undefined;

    if (daily && weekly && daily > weekly) {
      form.setFields([
        {
          name: "daily_limit",
          errors: [t("DAILY_EXCEEDS_WEEKLY")],
        },
      ]);
      return;
    }
    if (weekly && monthly && weekly > monthly) {
      form.setFields([
        {
          name: "weekly_limit",
          errors: [t("WEEKLY_EXCEEDS_MONTHLY")],
        },
      ]);
      return;
    }
    if (daily && monthly && daily > monthly) {
      form.setFields([
        {
          name: "daily_limit",
          errors: [t("DAILY_EXCEEDS_MONTHLY")],
        },
      ]);
      return;
    }

    mutation.mutate(
      {
        daily_limit: daily,
        weekly_limit: weekly,
        monthly_limit: monthly,
      },
      {
        onSuccess: () => {
          setSuccessMsg(t("LIMITS_UPDATED"));
        },
      },
    );
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3>{title}</h3>
      <CoreForm
        layout="vertical"
        form={form}
        onFinish={onFinish}
        initialValues={{
          daily_limit: values?.daily_limit || "",
          weekly_limit: values?.weekly_limit || "",
          monthly_limit: values?.monthly_limit || "",
        }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <CoreForm.Item label={t("DAILY")} name="daily_limit">
              <CoreInput type="number" disabled={isUserDataLoading} />
            </CoreForm.Item>
          </Col>
          <Col span={8}>
            <CoreForm.Item label={t("WEEKLY")} name="weekly_limit">
              <CoreInput type="number" disabled={isUserDataLoading} />
            </CoreForm.Item>
          </Col>
          <Col span={8}>
            <CoreForm.Item label={t("MONTHLY")} name="monthly_limit">
              <CoreInput type="number" disabled={isUserDataLoading} />
            </CoreForm.Item>
          </Col>
        </Row>

        {successMsg && (
          <div style={{ marginBottom: 16 }}>
            <CoreAlert message={successMsg} type="success" showIcon />
          </div>
        )}

        {mutation.error && (
          <div style={{ marginBottom: 16 }}>
            <CoreAlert message={t("API_ERROR")} type="error" showIcon />
          </div>
        )}

        <CoreButton
          type="primary"
          htmlType="submit"
          size="large"
          loading={mutation.isLoading}
          disabled={isUserDataLoading}
        >
          {t("SAVE")}
        </CoreButton>
      </CoreForm>
    </div>
  );
};

export { LimitForm };
