import Head from "next/head";
import { Layout } from "../../components/layout";
import { defaultNamespaces } from "../../providers/translations/defaults";
import UsersContainer from "../../containers/users";
import { useTranslation } from "i18n";
import { securedPage } from "../../utils/auth";
import { NextPageContext } from "next";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function Users() {
  const { t } = useTranslation(Users.namespace);
  return (
    <>
      <Head>
        <title>{t("HEADER")}</title>
      </Head>
      <Layout>
        <UsersContainer />
      </Layout>
    </>
  );
}

Users.namespace = "page-users";
Users.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, Users.namespace],
    },
    [PunterRoleEnum.ADMIN],
  );

export default Users;
