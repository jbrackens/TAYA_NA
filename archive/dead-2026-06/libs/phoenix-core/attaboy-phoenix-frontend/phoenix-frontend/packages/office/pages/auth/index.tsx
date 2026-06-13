import Head from "next/head";
import { Layout } from "../../components/layout";
import { defaultNamespaces } from "../../providers/translations/defaults";
import { useTranslation } from "i18n";
import { LoginComponent } from "../../components/auth/login";

function Auth() {
  const { t } = useTranslation(Auth.namespace);
  return (
    <>
      <Head>
        <title>{t("PAGE_HEADER")}</title>
      </Head>
      <Layout isAuth={true}>
        <LoginComponent />
      </Layout>
    </>
  );
}

Auth.namespace = "page-auth";
Auth.getInitialProps = async () => ({
  namespacesRequired: [...defaultNamespaces, Auth.namespace],
});

export default Auth;
