import React from "react";
import { CoreSelect } from "../../../ui/select";
import { useTranslation } from "i18n";
import { StepTitle, TitleNameContainer } from "../index.styled";
import { FirstNameContainer } from "../../../../components/modals/index.styled";
import { CoreInput } from "../../../ui/input";
import {
  InputsContainer,
  SelectContainer,
} from "../../../ui/form/index.styled";
import { CoreForm } from "../../../ui/form";
import { FormInstance } from "antd/lib/form";

const { Option, OptionContent } = CoreSelect;

type Props = {
  currentStep: number;
  form: FormInstance;
};

const Step1: React.FC<Props> = ({ currentStep, form }) => {
  if (currentStep !== 0) {
    return null;
  }

  const { t } = useTranslation(["register", "common"]);

  const titleSelector = (
    <CoreForm.Item name={["name", "title"]}>
      <CoreSelect
        style={{ width: 72 }}
        placeholder={t("LEGAL_TITLE")}
        dropdownStyle={{
          backgroundColor: "transparent",
        }}
        getPopupContainer={(triggerNode: HTMLElement) =>
          triggerNode.parentNode as HTMLElement
        }
      >
        <Option value="Mr">
          <OptionContent>Mr</OptionContent>
        </Option>
        <Option value="Mrs">
          <OptionContent>Mrs</OptionContent>
        </Option>
      </CoreSelect>
    </CoreForm.Item>
  );

  const firstNameFormItem = (
    <CoreForm.Item name={["name", "firstName"]}>
      <CoreInput
        onBlur={(value) => {
          form.setFieldsValue({
            name: { firstName: value.currentTarget.value.trim() },
          });
        }}
      />
    </CoreForm.Item>
  );

  return (
    <fieldset>
      <StepTitle level={3}>{t("STEP1_TITLE")}</StepTitle>
      <InputsContainer>
        <CoreForm.Item
          label={t("USERNAME")}
          name="username"
          rules={[
            {
              required: true,
              message: t("USERNAME_ERROR"),
            },
            ({ getFieldValue }) => ({
              validator(_rule) {
                if (
                  getFieldValue("username") !== undefined &&
                  getFieldValue("username").includes("@")
                ) {
                  return Promise.reject(t("USERNAME_ERROR_EMAIL"));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <CoreInput
            onBlur={(value) => {
              form.setFieldsValue({
                username: value.currentTarget.value.trim(),
              });
            }}
          />
        </CoreForm.Item>

        <CoreForm.Item
          label={t("FIRST_NAME")}
          name="titleName"
          validateTrigger="onBlur"
          rules={[
            ({ getFieldValue }) => ({
              validator(_rule) {
                if (
                  getFieldValue(["name", "firstName"]) !== undefined &&
                  getFieldValue(["name", "title"]) !== undefined
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(t("FIRST_NAME_TITLE_ERROR"));
              },
            }),
          ]}
        >
          <TitleNameContainer>
            <SelectContainer>{titleSelector}</SelectContainer>
            <FirstNameContainer>{firstNameFormItem}</FirstNameContainer>
          </TitleNameContainer>
        </CoreForm.Item>

        <CoreForm.Item
          label={t("LAST_NAME")}
          name={["name", "lastName"]}
          rules={[
            {
              required: true,
              message: t("LAST_NAME_ERROR"),
            },
          ]}
        >
          <CoreInput
            onBlur={(value) => {
              form.setFieldsValue({
                name: { lastName: value.currentTarget.value.trim() },
              });
            }}
          />
        </CoreForm.Item>

        <CoreForm.Item
          label={t("EMAIL")}
          name="email"
          validateTrigger="onBlur"
          rules={[
            {
              required: true,
              type: "email",
              message: t("EMAIL_ERROR"),
            },
          ]}
        >
          <CoreInput
            onBlur={(value) => {
              form.setFieldsValue({
                email: value.currentTarget.value.trim(),
              });
            }}
          />
        </CoreForm.Item>

        <CoreForm.Item
          label={t("PASSWORD")}
          name="password"
          rules={[
            {
              required: true,
              pattern: new RegExp(t("common:PASSWORD_REGEX")),
              message: t("PASSWORD_FORMAT_ERROR"),
            },
          ]}
        >
          <CoreInput.Password />
        </CoreForm.Item>

        <CoreForm.Item
          label={t("CONFIRM_PASSWORD")}
          name="confirmPassword"
          rules={[
            {
              required: true,
              message: t("PASSWORD_ERROR"),
            },
            ({ getFieldValue }) => ({
              validator(_rule, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(t("PASSWORD_NOT_MATCH"));
              },
            }),
          ]}
        >
          <CoreInput.Password />
        </CoreForm.Item>
      </InputsContainer>
    </fieldset>
  );
};

export { Step1 };
