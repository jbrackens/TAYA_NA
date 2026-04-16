import { defaultNamespaces } from "../../providers/translations/defaults";
import { useTranslation } from "i18n";
import { Layout } from "../../components/layout";
import Head from "next/head";
import { NextPageContext } from "next";
import { securedPage } from "../../utils/auth";
import TermsAndConditionsContainer from "../../containers/terms-and-conditions";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function TermsAndConditions() {
  const { t } = useTranslation(TermsAndConditions.namespace);

  return (
    <>
      <Head>
        <title>{t("HEADER")}</title>
      </Head>
      <Layout>
        <TermsAndConditionsContainer />
      </Layout>
    </>
  );
}

TermsAndConditions.namespace = "page-terms-and-conditions";
TermsAndConditions.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, TermsAndConditions.namespace],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
  );

export default TermsAndConditions;
