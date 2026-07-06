import React, { useEffect, useState } from "react";
import { i18n, useTranslation } from "i18n";
import { CustomFormForLanguageSelector, CustomSelect } from "./index.styled";
import { InputsContainer } from "../../../ui/form/index.styled";
import { CoreSelect } from "../../../ui/select";
import { CoreForm } from "../../../ui/form";
import {
  normalizeLocale,
  SupportedLocale,
  supportedLocales,
} from "../../../../lib/i18n/locales";
import {
  persistLocale,
  readPersistedLocale,
} from "../../../../lib/i18n/locale-persistence";

const { Option, OptionContent } = CoreSelect;

type LanguageSelectorSource = "header" | "mobile_menu" | "settings";

type LanguageSelectorComponentProps = {
  source?: LanguageSelectorSource;
};

const trackLanguageEvent = (event: string, payload: Record<string, string>) => {
  if (typeof window === "undefined") {
    return;
  }

  const dataLayer = (window as any).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({ event, ...payload });
  }
};

const LanguageSelectorComponent: React.FC<LanguageSelectorComponentProps> = ({
  source = "header",
}) => {
  const { t } = useTranslation(["language-selector"]);
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>(() =>
    normalizeLocale(i18n.language),
  );

  useEffect(() => {
    const persistedLocale = readPersistedLocale();
    setSelectedLocale(persistedLocale);

    if (normalizeLocale(i18n.language) !== persistedLocale) {
      i18n.changeLanguage(persistedLocale);
    }
  }, []);

  const handleChange = (value: any) => {
    const previousLocale = selectedLocale;
    const newLocale = persistLocale(value);

    setSelectedLocale(newLocale);
    i18n.changeLanguage(newLocale);

    if (previousLocale !== newLocale) {
      trackLanguageEvent("language_changed", {
        previousLocale,
        newLocale,
        source,
      });
    }
  };

  const handleDropdownVisibleChange = (open: boolean) => {
    if (!open) {
      return;
    }

    trackLanguageEvent("language_selector_opened", {
      previousLocale: selectedLocale,
      newLocale: selectedLocale,
      source,
    });
  };

  return (
    <CustomFormForLanguageSelector>
      <InputsContainer>
        <CoreForm.Item>
          <CustomSelect
            aria-label={t("SELECT_LANGUAGE")}
            onChange={handleChange}
            onDropdownVisibleChange={handleDropdownVisibleChange}
            value={selectedLocale}
            dropdownStyle={{
              backgroundColor: "transparent",
            }}
          >
            {supportedLocales.map((locale) => (
              <Option value={locale.code} key={locale.code}>
                <OptionContent>{locale.label}</OptionContent>
              </Option>
            ))}
          </CustomSelect>
        </CoreForm.Item>
      </InputsContainer>
    </CustomFormForLanguageSelector>
  );
};

export { LanguageSelectorComponent };
