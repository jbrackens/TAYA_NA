import Head from "next/head";
import { useTranslation } from "i18n";
import { useNavigation } from "@phoenix-ui/utils";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { DepositLimitsComponent } from "../../profile/deposit";
import { defaultNamespaces } from "../defaults";
import { StyledTitle } from "../../../components/pages/account/index.styled";

function Limits() {
  useNavigation(changeLocationToAccount, changeLocationToStandard);

  const { t } = useTranslation(["limits"]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <StyledTitle>{t("TITLE")}</StyledTitle>
      <DepositLimitsComponent />
    </>
  );
}

Limits.namespacesRequired = [...defaultNamespaces, "limits", "deposit-limits"];

export default Limits;
