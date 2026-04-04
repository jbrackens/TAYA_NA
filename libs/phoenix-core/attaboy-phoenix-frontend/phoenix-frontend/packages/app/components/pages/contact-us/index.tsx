import Head from "next/head";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { StaticContentBlock } from "../../static-page";
import { StyledOpenChatButton } from "./index.styled";

function ContactUs() {
  const { t } = useTranslation(["page-contact-us"]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <>
        <StaticContentBlock
          title={t("TITLE")}
          content={
            <>
              <p>
                Welcome to VIE support desk. We’re here and ready to help.
                Select the options below to contact our support team.
              </p>
              <StyledOpenChatButton />
              <p>
                <strong>Live chat operating hours</strong>
              </p>
              <p>Monday–Sunday: 09:00-21:00 (EST)</p>
              <p>Telephone: +1 (855) 944-3578</p>
              <p>
                <strong>Email queries</strong>
              </p>
              <p>
                <a href="mailto:help@vie.gg">help@vie.gg</a>
              </p>
            </>
          }
        />
      </>
    </>
  );
}

ContactUs.namespacesRequired = [...defaultNamespaces, "page-contact-us"];

export default ContactUs;
