import React, { useState } from "react";
import { SettingsContainer } from "./index.styled";
import { Tabs, Header } from "ui";
import ProfileSettings from "./profileSettings";
import ChangePassword from "./changePassword";
import Billing from "./billing";
import { defaultNamespaces } from "../defaults";
import {
  ProfileFormData,
  SettingsTabs,
  profileDataInitialValues,
  billingDataInitialValues,
} from "utils";
import { useTranslation } from "next-export-i18n";

const Settings = () => {
  const { t } = useTranslation();

  const [currentSettings, setCurrentSettings] = useState<string>(
    SettingsTabs[0],
  );
  const [profileDetails, setProfileDetails] = useState<ProfileFormData>(
    profileDataInitialValues,
  );
  const [billingDetails, setBillingDetails] = useState(
    billingDataInitialValues,
  );

  const Content = () => {
    switch (currentSettings) {
      case SettingsTabs[0]:
        return (
          <ProfileSettings
            data={profileDetails}
            onChangeData={setProfileDetails}
          />
        );
      case SettingsTabs[1]:
        return <ChangePassword />;
      case SettingsTabs[2]:
        return (
          <Billing data={billingDetails} onChangeData={setBillingDetails} />
        );
    }
  };
  return (
    <SettingsContainer>
      <Header type="h3" customFontSize={24} size="small">
        {t("SETTINGS_HEADER")}
      </Header>
      <Tabs
        tabs={SettingsTabs}
        selectedTab={currentSettings}
        onTabChange={setCurrentSettings}
      />
      <Content />
    </SettingsContainer>
  );
};

Settings.namespacesRequired = [...defaultNamespaces];

export default Settings;
