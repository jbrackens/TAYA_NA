import Head from "next/head";
import { useTranslation } from "i18n";
import { useNavigation } from "@phoenix-ui/utils";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { SecurityComponent } from "../../../components/profile/security";
import { defaultNamespaces } from "../defaults";
import { StyledTitle } from "../../../components/pages/account/index.styled";

function Security() {
  const { t } = useTranslation(["security"]);
  useNavigation(changeLocationToAccount, changeLocationToStandard);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <StyledTitle>{t("TITLE")}</StyledTitle>
      <SecurityComponent />
    </>
  );
}

Security.namespacesRequired = [
  ...defaultNamespaces,
  "security",
  "password-editor",
  "mfa",
];

export default Security;
