import Head from "next/head";
import { Layout } from "../../components/layout";
import { defaultNamespaces } from "../../providers/translations/defaults";
import PredictionMarketsContainer from "../../containers/prediction-markets";
import { securedPage } from "../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function PredictionMarketsPage() {
  return (
    <>
      <Head>
        <title>Prediction Markets — Admin</title>
      </Head>
      <Layout>
        <PredictionMarketsContainer />
      </Layout>
    </>
  );
}

PredictionMarketsPage.namespace = "page-prediction-markets";
PredictionMarketsPage.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(ctx, { namespacesRequired: [...defaultNamespaces] }, [
    PunterRoleEnum.ADMIN,
    PunterRoleEnum.TRADER,
    PunterRoleEnum.OPERATOR,
  ]);

export default PredictionMarketsPage;
