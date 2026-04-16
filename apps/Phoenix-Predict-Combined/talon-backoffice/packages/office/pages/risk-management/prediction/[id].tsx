import Head from "next/head";
import { useRouter } from "next/router";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import PredictionOpsContainer from "../../../containers/prediction-ops";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function PredictionOpsDetailPage() {
  const router = useRouter();
  const { t } = useTranslation(PredictionOpsDetailPage.namespace);
  const marketId = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;

  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout>
        <PredictionOpsContainer marketId={`${marketId || ""}`} />
      </Layout>
    </>
  );
}

PredictionOpsDetailPage.namespace = "page-prediction-ops";
PredictionOpsDetailPage.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, PredictionOpsDetailPage.namespace],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER, PunterRoleEnum.OPERATOR],
  );

export default PredictionOpsDetailPage;
