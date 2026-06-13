import Head from "next/head";
import { Layout } from "../../../components/layout";
import { defaultNamespaces } from "../../../providers/translations/defaults";
import FixturesContainer from "../../../containers/fixtures";
import { useTranslation } from "i18n";
import { securedPage } from "../../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function Fixtures() {
  const { t } = useTranslation(Fixtures.namespace);
  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout>
        <FixturesContainer />
      </Layout>
    </>
  );
}

Fixtures.namespace = "page-fixtures";
Fixtures.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [
        ...defaultNamespaces,
        Fixtures.namespace,
        "sport",
        "page-markets",
      ],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
  );

export default Fixtures;
