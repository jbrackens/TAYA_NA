import Head from "next/head";
import { useTranslation } from "i18n";
import { useNavigation } from "@phoenix-ui/utils";
import {
  changeLocationToAccount,
  changeLocationToStandard,
} from "../../../lib/slices/navigationSlice";
import { CommunicationComponent } from "../../../components/profile/communication";
import { defaultNamespaces } from "../defaults";
import { StyledTitle } from "../../../components/pages/account/index.styled";

function Notifications() {
  const { t } = useTranslation(["notifications"]);
  useNavigation(changeLocationToAccount, changeLocationToStandard);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <StyledTitle>{t("TITLE")}</StyledTitle>
      <CommunicationComponent />
    </>
  );
}

Notifications.namespacesRequired = [
  ...defaultNamespaces,
  "notifications",
  "communication-settings",
];
export default Notifications;
