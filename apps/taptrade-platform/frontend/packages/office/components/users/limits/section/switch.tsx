import React from "react";
import { Switch } from "antd";
import { useTranslation } from "i18n";

type UsersDetailsLimitsSectionSwitchProps = {
  value: boolean;
  onChange: Function;
};

const UsersDetailsLimitsSectionSwitch: React.FC<UsersDetailsLimitsSectionSwitchProps> = ({
  value,
  onChange,
}: UsersDetailsLimitsSectionSwitchProps) => {
  const { t } = useTranslation("page-users-details");

  return (
    <Switch
      checked={value}
      checkedChildren={t("MODAL_LIMITS_FORM_SWITCH_EDITABLE")}
      unCheckedChildren={t("MODAL_LIMITS_FORM_SWITCH_LOCKED")}
      onChange={() => onChange(!value)}
    />
  );
};

export default UsersDetailsLimitsSectionSwitch;
