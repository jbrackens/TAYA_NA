import { defaultNamespaces } from "../providers/translations/defaults";
import { useTranslation } from "i18n";
import { Layout } from "../components/layout";
import Head from "next/head";
import { NextPageContext } from "next";
import { securedPage, validateAndCheckEligibility } from "../utils/auth";
import { PunterRoleEnum, useToken } from "@phoenix-ui/utils";
import { useEffect } from "react";

function Dashboard() {
  const { t } = useTranslation(Dashboard.namespace);
  const { getToken } = useToken();

  const token = typeof localStorage !== "undefined" ? getToken() : "";

  useEffect(() => {
    if (token !== null && token !== "" && validateAndCheckEligibility(token)) {
      window.location.replace("/users");
    } else {
      window.location.replace("auth?redirectTo=users");
    }
  }, []);

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <Layout>
        <>
          <h1>{t("HEADER")}</h1>
        </>
      </Layout>
    </>
  );
}

Dashboard.namespace = "page-dashboard";
Dashboard.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [...defaultNamespaces, Dashboard.namespace],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
  );

export default Dashboard;
