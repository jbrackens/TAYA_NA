import Head from "next/head";
import { Layout } from "../../components/layout";
import { defaultNamespaces } from "../../providers/translations/defaults";
import AuditLogsContainer from "../../containers/audit-logs";
import { useTranslation } from "i18n";
import { securedPage } from "../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function AuditLogs() {
  const { t } = useTranslation(AuditLogs.namespace);
  return (
    <>
      <Head>
        <title>{t("HEADER")}</title>
      </Head>
      <Layout>
        <AuditLogsContainer />
      </Layout>
    </>
  );
}

AuditLogs.namespace = "page-audit-logs";
AuditLogs.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, AuditLogs.namespace],
    },
    [PunterRoleEnum.ADMIN],
  );

export default AuditLogs;
