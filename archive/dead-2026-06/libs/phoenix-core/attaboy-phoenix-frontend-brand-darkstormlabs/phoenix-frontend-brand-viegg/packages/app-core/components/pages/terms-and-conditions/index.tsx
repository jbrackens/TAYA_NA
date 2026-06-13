import Head from "next/head";
import { useEffect, useState } from "react";
import { useTranslation } from "i18n";
import { useApi } from "../../../services/api/api-service";
import { StaticContentBlock } from "../../static-page";
import { Content } from "../responsible-gaming/index.styled";
import { defaultNamespaces } from "../defaults";
import { CenteredSpinner } from "./index.styled";

const SPINNER_DELAY = 500;

function TermsAndConditions() {
  const { t } = useTranslation(["page-terms"]);
  const getTerms = useApi(`terms`, "GET");
  const [termsContent, setTermsContent] = useState<string>("");

  useEffect(() => {
    getTerms.triggerApi();
  }, []);

  useEffect(() => {
    const data = getTerms.data;
    if (!data) return;
    setTermsContent(data.content);
  }, [getTerms.statusOk]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <>
        {getTerms.isLoading ? (
          <CenteredSpinner size="large" delay={SPINNER_DELAY} />
        ) : (
          <>
            <StaticContentBlock
              title={t("TITLE")}
              content={
                <Content
                  dangerouslySetInnerHTML={{ __html: termsContent }}
                ></Content>
              }
            />
          </>
        )}
      </>
    </>
  );
}

TermsAndConditions.namespacesRequired = [...defaultNamespaces, "page-terms"];

export default TermsAndConditions;
