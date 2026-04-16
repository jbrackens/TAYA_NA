import Head from "next/head";
import { useTranslation } from "i18n";
import { StaticContentBlock } from "../../static-page";
import { Content } from "../responsible-gaming/index.styled";
import { defaultNamespaces } from "../defaults";
import { CoreSpin } from "../../ui/spin";
import { useTerms } from "../../../services/go-api/terms/terms-hooks";

function TermsAndConditions() {
  const { t } = useTranslation(["page-terms"]);
  const { data: terms, isLoading } = useTerms();

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <StaticContentBlock
        title={t("TITLE")}
        content={
          <Content>
            {isLoading ? (
              <CoreSpin spinning />
            ) : terms?.content ? (
              <div dangerouslySetInnerHTML={{ __html: terms.content }} />
            ) : (
              <p>{t("UNAVAILABLE")}</p>
            )}
          </Content>
        }
      />
    </>
  );
}

TermsAndConditions.namespacesRequired = [...defaultNamespaces, "page-terms"];

export default TermsAndConditions;
