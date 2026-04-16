import React from "react";
import { useTranslation } from "i18n";
import { StepTitle, TitleNameContainer } from "../index.styled";
import {
  DateSelectContainer,
  FirstNameContainer,
} from "../../../../components/modals/index.styled";
import { FormInstance } from "antd/lib/form";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { selectMinAgeToRegister } from "../../../../lib/slices/siteSettingsSlice";
import { isValidPhoneNumber } from "libphonenumber-js";
import { codes } from "./country-codes";
import { CoreInput } from "../../../ui/input";
import {
  InputsContainer,
  SelectContainer,
} from "../../../ui/form/index.styled";
import { CoreSelect } from "../../../ui/select";
import { CoreForm } from "../../../ui/form";

const { Option, OptionContent } = CoreSelect;

type Props = {
  currentStep: number;
  form: FormInstance;
};

const getDobMonths = () => {
  let content = [];

  for (let i = 1; i < 13; i++) {
    content.push(
      <Option key={i} value={i}>
        <OptionContent>{i}</OptionContent>
      </Option>,
    );
  }

  return content;
};

const getDobDays = () => {
  let content = [];

  for (let i = 1; i < 32; i++) {
    content.push(
      <Option key={i} value={i}>
        <OptionContent>{i}</OptionContent>
      </Option>,
    );
  }

  return content;
};

const getDobYears = () => {
  const maxYear = new Date().getFullYear();
  const minYear = maxYear - 100;

  let content = [];

  for (let i = maxYear; i > minYear; i--) {
    content.push(
      <Option key={i} value={i}>
        <OptionContent>{i}</OptionContent>
      </Option>,
    );
  }

  return content;
};

const Step2: React.FC<Props> = ({ currentStep, form }) => {
  if (currentStep !== 1) {
    return null;
  }

  const { t } = useTranslation(["register"]);
  const minAgeToRegister = useSelector(selectMinAgeToRegister);
  const sortedCountryCodes = codes.sort(
    (a, b) => parseFloat(a.dialCode) - parseFloat(b.dialCode),
  );

  const countryPrefixSelector = (
    <CoreForm.Item name={"countryPrefix"}>
      <CoreSelect
        showSearch
        style={{ width: 72 }}
        placeholder={"+"}
        dropdownStyle={{
          backgroundColor: "transparent",
        }}
        getPopupContainer={(triggerNode: HTMLElement) =>
          triggerNode.parentNode as HTMLElement
        }
      >
        {sortedCountryCodes.map((code) => (
          <Option value={code.dialCode} key={code.name}>
            <OptionContent>{code.dialCode}</OptionContent>
          </Option>
        ))}
      </CoreSelect>
    </CoreForm.Item>
  );

  const phoneNumberFormItem = (
    <CoreForm.Item name={"phoneNumber"}>
      <CoreInput
        type="phone"
        onBlur={(value) => {
          form.setFieldsValue({
            phoneNumber: value.currentTarget.value.trim(),
          });
        }}
      />
    </CoreForm.Item>
  );

  return (
    <fieldset>
      <StepTitle
        level={3}
        style={{ margin: "15px 0 20px 0", textAlign: "center" }}
      >
        {t("STEP2_TITLE")}
      </StepTitle>

      <InputsContainer>
        <CoreForm.Item
          label={t("Verification")}
          name="ssn"
          validateTrigger="onBlur"
          rules={[
            {
              required: true,
              message: t("SSN_ERROR"),
              min: 4,
            },
            {
              pattern: new RegExp("^[0-9]*$"),
              message: t("SSN_ERROR_NUMBER_ONLY"),
            },
          ]}
        >
          <CoreInput
            placeholder={t("LAST_4_SSN")}
            maxLength={4}
            onBlur={(value) => {
              form.setFieldsValue({
                ssn: value.currentTarget.value.trim(),
              });
            }}
          />
        </CoreForm.Item>

        <CoreForm.Item
          label={t("DATE_OF_BIRTH")}
          name="dateOfBirth"
          validateTrigger={["onBlur", "onChange"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_rule) {
                if (
                  getFieldValue(["dateOfBirth", "day"]) !== undefined &&
                  getFieldValue(["dateOfBirth", "month"]) !== undefined &&
                  getFieldValue(["dateOfBirth", "year"]) !== undefined
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(t("DATE_OF_BIRTH_ERROR"));
              },
            }),
            ({ getFieldValue }) => ({
              validator(_rule) {
                const birthDate = dayjs(
                  `${getFieldValue(["dateOfBirth", "year"])}-${getFieldValue([
                    "dateOfBirth",
                    "month",
                  ])}-${getFieldValue(["dateOfBirth", "day"])}`,
                );
                if (
                  getFieldValue(["dateOfBirth", "day"]) !== undefined &&
                  getFieldValue(["dateOfBirth", "month"]) !== undefined &&
                  getFieldValue(["dateOfBirth", "year"]) !== undefined &&
                  dayjs().diff(birthDate, "year") < minAgeToRegister
                ) {
                  return Promise.reject(
                    t("AGE_VERIFICATION_ERROR", { age: minAgeToRegister }),
                  );
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <DateSelectContainer>
            <SelectContainer>
              <CoreForm.Item rules={[]} name={["dateOfBirth", "month"]}>
                <CoreSelect
                  placeholder={t("MONTH")}
                  onChange={() => form.validateFields(["dateOfBirth"])}
                  getPopupContainer={(triggerNode: HTMLElement) =>
                    triggerNode.parentNode as HTMLElement
                  }
                >
                  {getDobMonths()}
                </CoreSelect>
              </CoreForm.Item>
            </SelectContainer>

            <SelectContainer>
              <CoreForm.Item name={["dateOfBirth", "day"]}>
                <CoreSelect
                  placeholder={t("DAY")}
                  onChange={() => form.validateFields(["dateOfBirth"])}
                  getPopupContainer={(triggerNode: HTMLElement) =>
                    triggerNode.parentNode as HTMLElement
                  }
                >
                  {getDobDays()}
                </CoreSelect>
              </CoreForm.Item>
            </SelectContainer>

            <SelectContainer>
              <CoreForm.Item name={["dateOfBirth", "year"]}>
                <CoreSelect
                  placeholder={t("YEAR")}
                  onChange={() => form.validateFields(["dateOfBirth"])}
                  getPopupContainer={(triggerNode: HTMLElement) =>
                    triggerNode.parentNode as HTMLElement
                  }
                >
                  {getDobYears()}
                </CoreSelect>
              </CoreForm.Item>
            </SelectContainer>
          </DateSelectContainer>
        </CoreForm.Item>

        <CoreForm.Item
          label={t("MOBILE")}
          validateTrigger={["onBlur", "onChange"]}
          name="countryPrefixPhoneNumber"
          rules={[
            ({ getFieldValue }) => ({
              validator(_rule) {
                if (
                  getFieldValue("phoneNumber") !== undefined &&
                  getFieldValue("phoneNumber") !== "" &&
                  getFieldValue("countryPrefix") !== undefined &&
                  getFieldValue("countryPrefix") !== "" &&
                  !isValidPhoneNumber(
                    `${getFieldValue("countryPrefix")}${getFieldValue(
                      "phoneNumber",
                    )}`,
                  )
                ) {
                  return Promise.reject(t("MOBILE_ERROR2"));
                }
                return Promise.resolve();
              },
            }),
            ({ getFieldValue }) => ({
              validator(_rule) {
                if (
                  getFieldValue("phoneNumber") !== undefined &&
                  getFieldValue("phoneNumber") !== "" &&
                  getFieldValue("countryPrefix") !== undefined &&
                  getFieldValue("countryPrefix") !== ""
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(t("MOBILE_ERROR"));
              },
            }),
          ]}
        >
          <TitleNameContainer>
            <SelectContainer>{countryPrefixSelector}</SelectContainer>
            <FirstNameContainer>{phoneNumberFormItem}</FirstNameContainer>
          </TitleNameContainer>
        </CoreForm.Item>
      </InputsContainer>
    </fieldset>
  );
};

export { Step2 };
