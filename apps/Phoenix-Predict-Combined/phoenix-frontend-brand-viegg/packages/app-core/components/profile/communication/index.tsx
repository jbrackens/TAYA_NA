import React, { useEffect, useState } from "react";
import { CoreSpin } from "./../../ui/spin";
import { message } from "antd";
import { useTranslation } from "i18n";
import { useUpdatePreferences } from "../../../services/go-api";
import type { AppError } from "../../../services/go-api";
import {
  StyledCard,
  InfoRow,
  NameCol,
  StyledDivider,
  ValueCol,
  StyledButton,
  SpinnerContainer,
} from "./index.styled";
import { useSelector, useDispatch } from "react-redux";
import {
  selectAccountCommunicatePreferences,
  selectIsUserDataLoading,
  setIsAccountDataUpdateNeeded,
} from "../../../lib/slices/settingsSlice";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { isEqual } from "lodash";
import { CoreForm } from "../../ui/form";
import { CoreSwitch } from "../../ui/switch";

type FormValues = {
  [key: string]: boolean;
};

const CommunicationComponent: React.FC = () => {
  const { t } = useTranslation(["communication-settings"]);
  const preferencesMutation = useUpdatePreferences();
  const [form] = CoreForm.useForm();
  const [formChanged, setFormChanged] = useState(false);
  const [checkedElements, setCheckedElements] = useState<Array<string>>([]);
  const communicationPreferences = useSelector(
    selectAccountCommunicatePreferences,
  );
  const isUserDataLoading = useSelector(selectIsUserDataLoading);

  const dispatch = useDispatch();
  const getCheckedElements = () => {
    return Object.entries(communicationPreferences).map(([key, value]) => {
      if (value) {
        return key;
      } else {
        return "";
      }
    });
  };

  useEffect(() => {
    setCheckedElements(getCheckedElements());
  }, [communicationPreferences]);

  const onChange = (values: FormValues): void => {
    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        setCheckedElements((prev) => [...prev, key]);
      } else {
        setCheckedElements((prev) => prev.filter((el) => el !== key));
      }
    });
  };

  useEffect(() => {
    if (formChanged) {
      proceedChangeRequest();
      setFormChanged(false);
    }
  }, [formChanged]);

  useEffect(() => {
    if (preferencesMutation.isSuccess) {
      dispatch(setIsAccountDataUpdateNeeded(true));
      message.success(t("SETTINGS_UPDATED"));
    }
  }, [preferencesMutation.isSuccess]);

  const error = preferencesMutation.error as AppError | undefined;

  useEffect(() => {
    if (error) {
      error.payload?.errors?.forEach((err: { errorCode: string }) => {
        message.error(t(`api-errors:${err.errorCode}`));
      });
      preferencesMutation.reset();
      setCheckedElements(getCheckedElements());
    }
  }, [error]);

  const proceedChangeRequest = async () => {
    const communicationPreferencesKeys = [
      "announcements",
      "promotions",
      "subscriptionUpdates",
      "signInNotifications",
    ];
    const communicationPreferences = communicationPreferencesKeys.reduce(
      (obj: any, el) => {
        obj[el] = checkedElements.includes(el);
        return obj;
      },
      {},
    );
    preferencesMutation.mutate({
      communicationPreferences,
      // mocked for now
      bettingPreferences: {
        autoAcceptBetterOdds: false,
      },
    });
  };

  return (
    <>
      {isUserDataLoading ? (
        <SpinnerContainer>
          <CoreSpin spinning={isUserDataLoading} />
        </SpinnerContainer>
      ) : (
        <CoreForm
          layout={"vertical"}
          name="communicationStyledForm"
          onValuesChange={(changedFields, _allFields) => {
            onChange(changedFields);
          }}
          onFinish={proceedChangeRequest}
          form={form}
        >
          <StyledCard title={t("SEND_EMAILS_FOR")} bordered={false}>
            <InfoRow>
              <NameCol xxl={12} xl={12} md={12} sm={12} xs={12}>
                {t("ESP_ANNOUNCEMENTS")}
              </NameCol>
              <ValueCol>
                <CoreForm.Item name="announcements">
                  <CoreSwitch
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    checked={checkedElements?.includes("announcements")}
                  />
                </CoreForm.Item>
              </ValueCol>
            </InfoRow>
            <StyledDivider />
            <InfoRow>
              <NameCol xxl={12} xl={12} md={12} sm={12} xs={12}>
                {t("ESP_PROMOTIONS")}
              </NameCol>
              <ValueCol>
                <CoreForm.Item name="promotions">
                  <CoreSwitch
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    checked={checkedElements?.includes("promotions")}
                  />
                </CoreForm.Item>
              </ValueCol>
            </InfoRow>
            {/* <StyledDivider />
            <InfoRow>
              <NameCol xxl={12} xl={12} md={12} sm={12} xs={12}>
                {t("SUBSCRIPTION_UPDATES")}
              </NameCol>
              <ValueCol>
                <CoreForm.Item name="subscriptionUpdates">
                  <Switch
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    checked={checkedElements?.includes("subscriptionUpdates")}
                  />
                </CoreForm.Item>
              </ValueCol>
            </InfoRow> */}
            <StyledDivider />
            <InfoRow>
              <NameCol xxl={12} xl={12} md={12} sm={12} xs={12}>
                {t("SIGN_IN_NOTIFICATIONS")}
              </NameCol>
              <ValueCol>
                <CoreForm.Item name="signInNotifications">
                  <CoreSwitch
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                    checked={checkedElements?.includes("signInNotifications")}
                  />
                </CoreForm.Item>
              </ValueCol>
            </InfoRow>
          </StyledCard>
          <StyledButton
            type="primary"
            htmlType="submit"
            loading={preferencesMutation.isLoading}
            disabled={isEqual(
              checkedElements.sort(),
              getCheckedElements().sort(),
            )}
          >
            {t("UPDATE")}
          </StyledButton>
        </CoreForm>
      )}
    </>
  );
};

export { CommunicationComponent };
