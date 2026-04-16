import Head from "next/head";
import { Layout } from "../../components/layout";
import { defaultNamespaces } from "../../providers/translations/defaults";
import PredictionSettlementsContainer from "../../containers/prediction-settlements";
import { securedPage } from "../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function PredictionSettlementsPage() {
  return (
    <>
      <Head>
        <title>Settlement Queue — Admin</title>
      </Head>
      <Layout>
        <PredictionSettlementsContainer />
      </Layout>
    </>
  );
}

PredictionSettlementsPage.namespace = "page-prediction-settlements";
PredictionSettlementsPage.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(ctx, { namespacesRequired: [...defaultNamespaces] }, [
    PunterRoleEnum.ADMIN,
  ]);

export default PredictionSettlementsPage;
