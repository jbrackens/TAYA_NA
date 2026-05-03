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
    // After login, send admins to the prediction-platform dashboard (App
    // Router /dashboard route). The legacy default "/users" was a leftover
    // from the sportsbook fork and that page currently errors with
    // "Failed to load users" because the backing endpoint isn't wired.
    if (token !== null && token !== "" && validateAndCheckEligibility(token)) {
      window.location.replace("/dashboard");
    } else {
      window.location.replace("/auth/login?returnUrl=/dashboard");
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
