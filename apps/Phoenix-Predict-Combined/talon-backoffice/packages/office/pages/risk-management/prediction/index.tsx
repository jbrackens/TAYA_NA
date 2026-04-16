import Head from "next/head";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import PredictionOpsContainer from "../../../containers/prediction-ops";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function PredictionOpsPage() {
  const { t } = useTranslation(PredictionOpsPage.namespace);
  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout>
        <PredictionOpsContainer />
      </Layout>
    </>
  );
}

PredictionOpsPage.namespace = "page-prediction-ops";
PredictionOpsPage.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, PredictionOpsPage.namespace],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER, PunterRoleEnum.OPERATOR],
  );

export default PredictionOpsPage;
