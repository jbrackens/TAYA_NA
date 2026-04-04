import React, { useEffect, FC } from "react";
import { Formik, Field, Form } from "formik";
import { SettingsContent } from "./../index.styled";
import { useTranslation } from "next-export-i18n";
import { Input } from "ui";
import { useApi } from "../../../../services/api-service";
import {
  ProfileDetailsDataType,
  SettingsPagesProfileProps,
  status,
} from "utils";

const ProfileSettings: FC<SettingsPagesProfileProps> = ({
  data,
  onChangeData,
}) => {
  const { t } = useTranslation();

  const getProfile: {
    data: ProfileDetailsDataType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    "ipm/profile",
    "GET",
    "https://api.dev.stella.waysungames.com/mock",
  );

  useEffect(() => {
    if (!data.username || !data.email) {
      getProfile.triggerApi();
    }
  }, []);

  useEffect(() => {
    if (getProfile.data && getProfile.data?.status === status.OK) {
      onChangeData(getProfile.data.details);
    }
  }, [getProfile.data]);

  return (
    <SettingsContent>
      <Formik
        enableReinitialize
        initialValues={{
          username: data.username,
          email: data.email,
        }}
        onSubmit={() => {}}
      >
        {({ errors, touched }) => (
          <Form>
            <Field
              labelText={t("SETTINGS_UNAME")}
              id="username"
              name="username"
              as={Input}
              fullWidth
              error={errors.username && touched.username ? errors.username : ""}
              loading={getProfile.isLoading}
              disabled
            />
            <Field
              labelText={t("SETTINGS_EMAIL")}
              id="email"
              name="email"
              as={Input}
              fullWidth
              error={errors.email && touched.email ? errors.email : ""}
              loading={getProfile.isLoading}
              disabled
            />
          </Form>
        )}
      </Formik>
    </SettingsContent>
  );
};

export default ProfileSettings;
