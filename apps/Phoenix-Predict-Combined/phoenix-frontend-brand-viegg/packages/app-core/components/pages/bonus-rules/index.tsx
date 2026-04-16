import Head from "next/head";
import { defaultNamespaces } from "../defaults";
import { useTranslation } from "i18n";
import { Content } from "../responsible-gaming/index.styled";
import { StaticContentBlock } from "../../static-page";

function BonusRules() {
  const { t } = useTranslation(["page-bonus-rules"]);

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

BonusRules.namespacesRequired = [...defaultNamespaces, "page-bonus-rules"];

export default BonusRules;
