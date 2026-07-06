import React from "react";
import { useTranslation } from "i18n";
import { NameCol, ChangeCol } from "../../personal-details/index.styled";
import { CoreForm } from "../../../ui/form";
import { CoreSwitch } from "../../../ui/switch";
import { useProfile } from "../../../../services/go-api";
import { useToggleMfa } from "../../../../services/go-api/verification/verification-hooks";

const MfaToggleComponent: React.FC = () => {
  const { t } = useTranslation(["mfa"]);
  const { data: profile } = useProfile();
  const toggleMutation = useToggleMfa();

  const isMfaEnabled = !!(profile as any)?.twoFactorAuthEnabled;

  const handleToggle = () => {
    toggleMutation.mutate({ enabled: !isMfaEnabled });
  };

  return (
    <>
      <NameCol
        xxl={{ span: 8 }}
        xl={{ span: 8 }}
        lg={{ span: 5 }}
        md={{ span: 5 }}
        sm={{ span: 8 }}
        xs={{ span: 8 }}
      >
        {t("SETTINGS_TITLE")}
      </NameCol>
      <ChangeCol
        xxl={{ span: 16 }}
        xl={{ span: 16 }}
        lg={{ span: 19 }}
        md={{ span: 19 }}
        sm={{ span: 16 }}
        xs={{ span: 16 }}
      >
        <CoreForm>
          <CoreSwitch
            checked={isMfaEnabled}
            disabled={false}
            loading={toggleMutation.isLoading}
            onChange={handleToggle}
          />
        </CoreForm>
      </ChangeCol>
    </>
  );
};

export { MfaToggleComponent };
