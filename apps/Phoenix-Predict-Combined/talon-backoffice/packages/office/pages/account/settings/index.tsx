import Head from "next/head";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";
import { SettingsContainer } from "../../../containers/account/settings";

function Settings() {
  const { t } = useTranslation(Settings.namespace);
  return (
    <>
      <Head>
        <title>{t("HEADER")}</title>
      </Head>
      <Layout>
        <SettingsContainer />
      </Layout>
    </>
  );
}

Settings.namespace = "page-settings";
Settings.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, Settings.namespace],
    },
    [PunterRoleEnum.ADMIN],
  );

export default Settings;
