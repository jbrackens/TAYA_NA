import Head from "next/head";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import MarketsContainer from "../../../containers/markets";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function Markets() {
  const { t } = useTranslation(Markets.namespace);
  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout>
        <MarketsContainer />
      </Layout>
    </>
  );
}

Markets.namespace = "page-markets";
Markets.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, Markets.namespace, "sport"],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
  );

export default Markets;
