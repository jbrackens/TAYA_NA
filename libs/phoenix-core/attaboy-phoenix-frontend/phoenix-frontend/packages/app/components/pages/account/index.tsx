import React from "react";
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
import {
  selectUserPersonalDetails,
  selectIsUserDataLoading,
} from "../../../lib/slices/settingsSlice";
import { StyledTitle } from "./index.styled";

function Settings() {
  const { t } = useTranslation(["account"]);
  const userData = useSelector(selectUserPersonalDetails);
  const isLoading = useSelector(selectIsUserDataLoading);
  useNavigation(changeLocationToAccount, changeLocationToStandard);
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
            </section>
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
