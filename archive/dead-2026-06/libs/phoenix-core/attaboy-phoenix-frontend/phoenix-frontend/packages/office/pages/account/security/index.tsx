import Head from "next/head";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";
import { SecurityContainer } from "../../../containers/account/security";

function Security() {
  const { t } = useTranslation(Security.namespace);
  return (
    <>
      <Head>
        <title>{t("HEADER")}</title>
      </Head>
      <Layout>
        <SecurityContainer />
      </Layout>
    </>
  );
}

Security.namespace = "page-security";
Security.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, Security.namespace],
    },
    [PunterRoleEnum.ADMIN],
  );

export default Security;
