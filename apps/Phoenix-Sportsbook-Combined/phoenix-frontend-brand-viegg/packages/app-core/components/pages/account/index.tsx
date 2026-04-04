import React, { useMemo } from "react";
import Head from "next/head";
import { Row, Col } from "antd";
import { CoreSpin } from "./../../ui/spin";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { PersonalDetailsComponent } from "../../../components/profile/personal-details";
import { useSelector } from "react-redux";
import { useNavigation } from "@phoenix-ui/utils";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { selectIsLoggedIn } from "../../../lib/slices/authSlice";
import {
  selectUserPersonalDetails,
  selectIsUserDataLoading,
} from "../../../lib/slices/settingsSlice";
import {
  PromoAvailabilityContainer,
  PromoAvailabilityTitle,
  PromoHint,
  PromoMetricLabel,
  PromoMetricRow,
  PromoMetricValue,
  StyledTitle,
} from "./index.styled";
import { useFreebets, useOddsBoosts } from "../../../services/go-api";
import { parseIntegrationMode } from "../../../lib/integration-mode";
import { resolveAccountModules } from "./module-registry";

const {
  SPORTSBOOK_INTEGRATION_MODE,
  SPORTSBOOK_ACCOUNT_MODULES,
} = require("next/config").default().publicRuntimeConfig;

const formatPromoExpiry = (value?: string): string => {
  if (!value) {
    return "N/A";
  }

  const parsedMs = Date.parse(value);
  if (Number.isNaN(parsedMs)) {
    return "N/A";
  }

  return new Date(parsedMs).toLocaleString();
};

function Settings() {
  const { t } = useTranslation(["account"]);
  const userData = useSelector(selectUserPersonalDetails);
  const isLoading = useSelector(selectIsUserDataLoading);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const userId = useSelector((state: any) => state.settings.userData.userId) as string;
  const effectiveUserId = `${userId || ""}`.trim();
  const accountModuleConfig = useMemo(
    () =>
      resolveAccountModules(
        parseIntegrationMode(SPORTSBOOK_INTEGRATION_MODE),
        SPORTSBOOK_ACCOUNT_MODULES,
      ),
    [],
  );
  const { data: freebetsData } = useFreebets(effectiveUserId, "active");
  const { data: oddsBoostsData } = useOddsBoosts(effectiveUserId, "available");

  useNavigation(changeLocationToAccount, changeLocationToStandard);

  const activeFreebetsCount = useMemo(() => {
    return freebetsData?.data?.length ?? 0;
  }, [freebetsData]);

  const remainingFreebetCents = useMemo(() => {
    if (!freebetsData?.data) return 0;
    return freebetsData.data.reduce(
      (sum, freebet) => sum + Math.round(freebet.amount * 100),
      0,
    );
  }, [freebetsData]);

  const availableOddsBoostCount = useMemo(() => {
    return oddsBoostsData?.data?.length ?? 0;
  }, [oddsBoostsData]);

  const nextPromoExpiry = useMemo(() => {
    const expiryValues: string[] = [];
    if (freebetsData?.data) {
      freebetsData.data.forEach((item) => {
        if (item.expires_at) expiryValues.push(item.expires_at);
      });
    }
    if (oddsBoostsData?.data) {
      oddsBoostsData.data.forEach((item) => {
        if (item.expires_at) expiryValues.push(item.expires_at);
      });
    }
    const parsedExpiries = expiryValues
      .map((value) => Date.parse(value))
      .filter((value) => !Number.isNaN(value));
    if (!parsedExpiries.length) {
      return undefined;
    }
    return new Date(Math.min(...parsedExpiries)).toISOString();
  }, [freebetsData, oddsBoostsData]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <Row>
        <StyledTitle>{t("TITLE")}</StyledTitle>
        <Col span={24}>
          <CoreSpin tip="Loading..." spinning={isLoading}>
            <section id="personal-details">
              {accountModuleConfig.showPersonalDetails && (
                <PersonalDetailsComponent
                  username={userData.username}
                  email={userData.email}
                  name={userData.name}
                  dateOfBirth={userData.dateOfBirth}
                  address={userData.address}
                  phoneNumber={userData.phoneNumber}
                  terms={userData.terms}
                  hasToAcceptTerms={userData.hasToAcceptTerms}
                  signUpDate={userData.signUpDate}
                />
              )}
            </section>
            {isLoggedIn && accountModuleConfig.showPromoAvailability && (
              <PromoAvailabilityContainer>
                <PromoAvailabilityTitle>
                  {t("PROMO_AVAILABILITY")}
                </PromoAvailabilityTitle>
                <PromoMetricRow>
                  <PromoMetricLabel>{t("ACTIVE_FREEBETS")}</PromoMetricLabel>
                  <PromoMetricValue role="account-active-freebets-count">
                    {activeFreebetsCount}
                  </PromoMetricValue>
                </PromoMetricRow>
                <PromoMetricRow>
                  <PromoMetricLabel>{t("AVAILABLE_ODDS_BOOSTS")}</PromoMetricLabel>
                  <PromoMetricValue role="account-available-odds-boosts-count">
                    {availableOddsBoostCount}
                  </PromoMetricValue>
                </PromoMetricRow>
                <PromoMetricRow>
                  <PromoMetricLabel>{t("NEXT_PROMO_EXPIRY")}</PromoMetricLabel>
                  <PromoMetricValue role="account-next-promo-expiry">
                    {nextPromoExpiry
                      ? formatPromoExpiry(nextPromoExpiry)
                      : t("NO_ACTIVE_PROMO_EXPIRY")}
                  </PromoMetricValue>
                </PromoMetricRow>
                {remainingFreebetCents > 0 && (
                  <PromoHint>
                    {t("FREEBET_BALANCE_CENTS", {
                      value: remainingFreebetCents,
                    })}
                  </PromoHint>
                )}
              </PromoAvailabilityContainer>
            )}
          </CoreSpin>
        </Col>
      </Row>
    </>
  );
}

Settings.namespacesRequired = [
  ...defaultNamespaces,
  "account",
  "personal-details",
  "identification-editor",
  "communication-settings",
  "security-settings",
  "wallet-preferences",
  "deposit-limits",
  "language-time-zones",
  "register",
];

export default Settings;
