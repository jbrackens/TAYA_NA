import Error from "next/error";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../../providers/translations/defaults";

function NotAuthorized() {
  const { t } = useTranslation(NotAuthorized.namespace);
  return <Error statusCode={403} title={t("NOT_AUTHORIZED")} />;
}

NotAuthorized.namespace = "error";
NotAuthorized.getInitialProps = async () => ({
  namespacesRequired: [...defaultNamespaces, NotAuthorized.namespace],
});

export default NotAuthorized;
