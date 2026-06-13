import Head from "next/head";
import { useTranslation } from "i18n";
import { useNavigation } from "@phoenix-ui/utils";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { LanguageTimeZoneComponent } from "../../../components/profile/language-time-zone";
import { defaultNamespaces } from "../defaults";
import { StyledTitle } from "../../../components/pages/account/index.styled";

function Settings() {
  const { t } = useTranslation(["settings"]);
  useNavigation(changeLocationToAccount, changeLocationToStandard);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <StyledTitle>{t("TITLE")}</StyledTitle>
      <LanguageTimeZoneComponent />
    </>
  );
}

Settings.namespacesRequired = [
  ...defaultNamespaces,
  "settings",
  "language-time-zones",
];

export default Settings;
