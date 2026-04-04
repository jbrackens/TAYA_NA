import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/router";
import { useTranslation } from "i18n";
import { Radio, Row, Col } from "antd";
import { CoreForm } from "../../ui/form";
import { CoreCheckbox } from "../../ui/checkbox";
import { CoreButton } from "../../ui/button";
import { CoreAlert } from "../../ui/alert";
import { logOut } from "../../../lib/slices/authSlice";
import { clearAuth } from "../../../services/go-api";
import { useSelfExclude } from "../../../services/go-api/compliance/compliance-hooks";

type Duration = "ONE_YEAR" | "FIVE_YEARS";

const SelfExcludeComponent: React.FC = () => {
  const { t } = useTranslation(["self-exclude", "responsible-gaming"]);
  const dispatch = useDispatch();
  const router = useRouter();
  const selfExcludeMutation = useSelfExclude();

  const [duration, setDuration] = useState<Duration>("ONE_YEAR");
  const [checks, setChecks] = useState([false, false, false, false]);

  const allChecked = checks.every(Boolean);

  const toggleCheck = (index: number) => {
    setChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleSubmit = () => {
    selfExcludeMutation.mutate(
      { duration },
      {
        onSuccess: () => {
          clearAuth();
          dispatch(logOut());
          router.push("/sports/home");
        },
      },
    );
  };

  return (
    <div>
      <h2>{t("TITLE")}</h2>
      <p>{t("DESCRIPTION")}</p>

      <CoreForm layout="vertical">
        <CoreForm.Item label={t("DURATION")}>
          <Radio.Group
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            <Radio value="ONE_YEAR">{t("ONE_YEAR")}</Radio>
            <Radio value="FIVE_YEARS">{t("FIVE_YEARS")}</Radio>
          </Radio.Group>
        </CoreForm.Item>

        <div style={{ marginBottom: 16 }}>
          <p>{t("CHECKBOXES_TITLE")}</p>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <CoreCheckbox
                checked={checks[i]}
                onChange={() => toggleCheck(i)}
              >
                {t(`CHECKBOX_${i + 1}`)}
              </CoreCheckbox>
            </div>
          ))}
        </div>

        {selfExcludeMutation.error && (
          <div style={{ marginBottom: 16 }}>
            <CoreAlert
              message={t("responsible-gaming:API_ERROR")}
              type="error"
              showIcon
            />
          </div>
        )}

        <Row>
          <Col span={24}>
            <CoreButton
              type="primary"
              size="large"
              block
              disabled={!allChecked}
              loading={selfExcludeMutation.isLoading}
              onClick={handleSubmit}
            >
              {t("SUBMIT")}
            </CoreButton>
          </Col>
        </Row>
      </CoreForm>
    </div>
  );
};

export { SelfExcludeComponent };
