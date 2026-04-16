import Head from "next/head";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";
import { Layout } from "../../../components/layout";
import RiskManagementSummaryContainer from "../../../containers/risk-management-summary";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";

function RiskManagementSummary() {
  const { t } = useTranslation(RiskManagementSummary.namespace);
  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout>
        <RiskManagementSummaryContainer />
      </Layout>
    </>
  );
}

RiskManagementSummary.namespace = "page-risk-management-summary";
RiskManagementSummary.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [
        ...defaultNamespaces,
        RiskManagementSummary.namespace,
        "sport",
      ],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER, PunterRoleEnum.OPERATOR],
  );

export default RiskManagementSummary;
