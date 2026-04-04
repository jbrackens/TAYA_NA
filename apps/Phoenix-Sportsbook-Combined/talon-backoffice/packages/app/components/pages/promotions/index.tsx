import Head from "next/head";
import { defaultNamespaces } from "../defaults";
import { StaticContentBlock } from "../../static-page";
import { useTranslation } from "i18n";
import { Content } from "../responsible-gaming/index.styled";

function Promotions() {
  const { t } = useTranslation(["page-promotions"]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <>
        <StaticContentBlock
          title={t("TITLE")}
          content={<Content>Waiting on required copy for this page</Content>}
        />
      </>
    </>
  );
}

Promotions.namespacesRequired = [...defaultNamespaces, "page-promotions"];

export default Promotions;
