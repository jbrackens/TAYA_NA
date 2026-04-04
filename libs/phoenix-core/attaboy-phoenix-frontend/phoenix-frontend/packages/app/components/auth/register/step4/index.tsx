import React from "react";
import { useTranslation } from "i18n";
import { RuleObject } from "rc-field-form/lib/interface";
import { ProhibitedEmployeeForm, StepTitle, TermsLink } from "../index.styled";
import { AddressFormItems } from "../../../profile/personal-details/address-form-items";
import { InputsContainer } from "../../../ui/form/index.styled";
import { CoreForm } from "../../../ui/form";
import { CoreCheckbox } from "../../../ui/checkbox";
import { FormInstance } from "antd/lib/form";

const { CDN_URL } = require("next/config").default().publicRuntimeConfig;

type Props = {
  currentStep: number;
  form: FormInstance;
};

const Step4: React.FC<Props> = ({ currentStep, form }) => {
  if (currentStep !== 3) {
    return null;
  }

  const { t } = useTranslation(["register"]);

  const termsValidation = (
    _rule: RuleObject,
    value: any,
    callback: (error?: string) => void,
  ) => {
    if (value.length === terms.length) {
      return callback();
    }
    return callback(t("TERMS_ERROR"));
  };

  const onTermsClick = () => window.open("/terms-and-conditions", "_blank");

  const terms = [
    {
      label: <TermsLink onClick={onTermsClick}>{t("TERMS")}</TermsLink>,
      value: "terms",
    },
    { label: t("TERMS_MY_ACCOUNT"), value: "termsMyAccount" },
    { label: t("TERMS_EMPLOYEE"), value: "termsEmployee" },
  ];

  return (
    <fieldset>
      <StepTitle
        level={3}
        style={{ margin: "15px 0 20px 0", textAlign: "center" }}
      >
        {t("STEP4_TITLE")}
      </StepTitle>

      <InputsContainer>
        <AddressFormItems form={form} />

        <CoreForm.Item
          name="terms"
          rules={[{ validator: termsValidation, message: t("TERMS_ERROR") }]}
        >
          <CoreCheckbox.Group options={terms} />
        </CoreForm.Item>
        <ProhibitedEmployeeForm>
          <CoreCheckbox>
            {t("PROHIBITED_EMPLOYEE_FORM")}{" "}
            <TermsLink
              href={`${CDN_URL}/registration-form/form.pdf`}
              target="_blank"
            >
              {t("HERE")}
            </TermsLink>
          </CoreCheckbox>
        </ProhibitedEmployeeForm>
      </InputsContainer>
    </fieldset>
  );
};

export { Step4 };
