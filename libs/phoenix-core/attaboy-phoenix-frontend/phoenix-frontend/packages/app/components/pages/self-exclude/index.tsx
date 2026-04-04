import Head from "next/head";
import { useTranslation } from "i18n";
import { useNavigation } from "@phoenix-ui/utils";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { SelfExcludeComponent } from "../../profile/self-exclude";
import { defaultNamespaces } from "../defaults";
import { StyledTitle } from "../account/index.styled";

function SelfExclude() {
  useNavigation(changeLocationToAccount, changeLocationToStandard);

  const { t } = useTranslation(["self-exclude"]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <StyledTitle>{t("TITLE")}</StyledTitle>
      <SelfExcludeComponent />
    </>
  );
}

SelfExclude.namespacesRequired = [...defaultNamespaces, "self-exclude"];

export default SelfExclude;
