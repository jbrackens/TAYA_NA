import Head from "next/head";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import FixedExoticsContainer from "../../../containers/fixed-exotics";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function FixedExotics() {
  const { t } = useTranslation(FixedExotics.namespace);
  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout>
        <FixedExoticsContainer />
      </Layout>
    </>
  );
}

FixedExotics.namespace = "page-fixed-exotics";
FixedExotics.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, FixedExotics.namespace],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
  );

export default FixedExotics;
