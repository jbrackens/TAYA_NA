import Head from "next/head";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";
import MarketCategoriesContainer from "../../../containers/market-categories";

function MarketCategories() {
  const { t } = useTranslation(MarketCategories.namespace);
  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout>
        <MarketCategoriesContainer />
      </Layout>
    </>
  );
}

MarketCategories.namespace = "page-market-categories";
MarketCategories.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, MarketCategories.namespace],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
  );

export default MarketCategories;
