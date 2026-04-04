import Head from "next/head";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import ProviderOpsContainer from "../../../containers/provider-ops";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function ProviderOps() {
  const { t } = useTranslation(ProviderOps.namespace);
  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout>
        <ProviderOpsContainer />
      </Layout>
    </>
  );
}

ProviderOps.namespace = "page-provider-ops";
ProviderOps.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, ProviderOps.namespace],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER, PunterRoleEnum.OPERATOR],
  );

export default ProviderOps;
