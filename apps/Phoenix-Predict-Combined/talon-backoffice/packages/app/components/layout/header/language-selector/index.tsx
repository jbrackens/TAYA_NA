import React from "react";
import { i18n, useTranslation } from "i18n";
import { CustomFormForLanguageSelector, CustomSelect } from "./index.styled";
import { InputsContainer } from "../../../ui/form/index.styled";
import { CoreSelect } from "../../../ui/select";
import { CoreForm } from "../../../ui/form";

const { Option, OptionContent } = CoreSelect;

function handleChange(value: string) {
  i18n.changeLanguage(value);
}

const LanguageSelectorComponent: React.FC = () => {
  const { t } = useTranslation(["language-selector"]);

  return (
    <CustomFormForLanguageSelector>
      <InputsContainer>
        <CoreForm.Item>
          <CustomSelect
            defaultValue="en"
            onChange={handleChange}
            value={i18n.language}
            dropdownStyle={{
              backgroundColor: "transparent",
            }}
          >
            <Option value="en">
              <OptionContent>{t("EN")}</OptionContent>
            </Option>
            <Option value="de">
              <OptionContent>{t("DE")} </OptionContent>
            </Option>
          </CustomSelect>
        </CoreForm.Item>
      </InputsContainer>
    </CustomFormForLanguageSelector>
  );
};

export { LanguageSelectorComponent };
