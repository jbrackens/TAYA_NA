import React from "react";
import { useTranslation, i18n } from "i18n";
import { useState } from "react";
import {
  StyledCard,
  InfoRow,
  NameCol,
  ValueCol,
  StyledButton,
  StyledDivider,
} from "./index.styled";
import {
  useLocalStorageVariables,
  DisplayOddsEnum,
  Timezones,
  timezones,
} from "@phoenix-ui/utils";
import { useSelector, useDispatch } from "react-redux";
import {
  selectOddsFormat,
  setOddsFormat as setOddsFormatAction,
} from "../../../lib/slices/settingsSlice";
import { CoreSelect } from "../../ui/select";
import { SelectContainer } from "../../ui/form/index.styled";
import { message } from "antd";

const {
  SHOW_FOR_SUBMISSION,
} = require("next/config").default().publicRuntimeConfig;

type LanguageTimeZoneComponentProps = {};

const LanguageTimeZoneComponent: React.FC<LanguageTimeZoneComponentProps> = () => {
  const { t } = useTranslation([
    "language-time-zones",
    "page-esports-bets",
    "communication-settings",
  ]);
  const { Option, OptionContent } = CoreSelect;
  const {
    getTimezone,
    saveTimezone,
    saveOddsFormat,
  } = useLocalStorageVariables();
  const currentTimezone =
    typeof localStorage !== "undefined" ? getTimezone() : "";
  const dispatch = useDispatch();
  const [language, setLanguage] = useState(i18n.language);
  const [timezone, setTimezone] = useState(currentTimezone);
  const currentOddsFormat = useSelector(selectOddsFormat);
  const [oddsFormat, setOddsFormat] = useState(currentOddsFormat);
  const {} = useLocalStorageVariables();

  const generateOptions = (zones: Timezones) =>
    Object.entries(zones).map(([key, value]) => (
      <Option value={key} key={key}>
        <OptionContent role={key}>{value}</OptionContent>
      </Option>
    ));

  const handleLanguageChange = (value: any) => {
    setLanguage(value);
  };

  const handleTimezoneChange = (value: any) => {
    setTimezone(value);
  };

  const handleOddsFormatChange = (value: any) => {
    setOddsFormat(value);
  };

  const updateSettings = () => {
    i18n.changeLanguage(language);
    saveTimezone(timezone);
    dispatch(setOddsFormatAction(oddsFormat));
    saveOddsFormat(oddsFormat);
    message.success(t("communication-settings:SETTINGS_UPDATED"));
  };

  const isButtonDisabled =
    timezone === currentTimezone &&
    language === i18n.language &&
    oddsFormat === currentOddsFormat;

  return (
    <>
      <StyledCard bordered={false}>
        {Number(SHOW_FOR_SUBMISSION) ? (
          <>
            <InfoRow>
              <NameCol xxl={12} xl={12} md={12} sm={12} xs={12}>
                <label>{t("LANGUAGE")}</label>
              </NameCol>
              <ValueCol xxl={12} xl={12} md={12} sm={12} xs={12}>
                <SelectContainer>
                  <CoreSelect
                    dropdownStyle={{
                      backgroundColor: "transparent",
                    }}
                    onChange={handleLanguageChange}
                    value={language}
                  >
                    <Option value="en">
                      <OptionContent role={"englishOption"}>
                        {t("ENGLISH")}
                      </OptionContent>
                    </Option>
                    <Option value="de">
                      <OptionContent>{t("DEUTSCH")}</OptionContent>
                    </Option>
                  </CoreSelect>
                </SelectContainer>
              </ValueCol>
            </InfoRow>
            <StyledDivider />
          </>
        ) : (
          <></>
        )}
        <InfoRow>
          <NameCol xxl={12} xl={12} md={12} sm={12} xs={12}>
            <label>{t("TIME_ZONE")}</label>
          </NameCol>

          <ValueCol xxl={12} xl={12} md={12} sm={12} xs={12}>
            <SelectContainer>
              <CoreSelect
                dropdownStyle={{
                  backgroundColor: "transparent",
                }}
                onChange={handleTimezoneChange}
                value={timezone}
              >
                {generateOptions(timezones)}
              </CoreSelect>
            </SelectContainer>
          </ValueCol>
        </InfoRow>

        <StyledDivider />

        <InfoRow>
          <NameCol xxl={12} xl={12} md={12} sm={12} xs={12}>
            <label>{t("ODDS_FORMAT")}</label>
          </NameCol>

          <ValueCol xxl={12} xl={12} md={12} sm={12} xs={12}>
            <SelectContainer>
              <CoreSelect
                dropdownStyle={{
                  backgroundColor: "transparent",
                }}
                onChange={handleOddsFormatChange}
                value={oddsFormat}
              >
                <Option value={DisplayOddsEnum.DECIMAL}>
                  <OptionContent>
                    {t("page-esports-bets:DECIMAL")}
                  </OptionContent>
                </Option>
                <Option value={DisplayOddsEnum.AMERICAN}>
                  <OptionContent>
                    {t("page-esports-bets:AMERICAN")}
                  </OptionContent>
                </Option>
                <Option value={DisplayOddsEnum.FRACTIONAL}>
                  <OptionContent>
                    {t("page-esports-bets:FRACTIONAL")}
                  </OptionContent>
                </Option>
              </CoreSelect>
            </SelectContainer>
          </ValueCol>
        </InfoRow>
      </StyledCard>
      <StyledButton
        onClick={updateSettings}
        type="primary"
        disabled={isButtonDisabled}
      >
        {t("UPDATE")}
      </StyledButton>
    </>
  );
};

export { LanguageTimeZoneComponent };
