import Head from "next/head";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { StaticContentBlock } from "../../static-page";

function About() {
  const { t } = useTranslation(["page-about"]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <>
        <StaticContentBlock
          title={t("SUBTITLE")}
          content={
            <>
              <p>Here at VIE we are obsessed with esports - just like you.</p>

              <p>
                That’s why we made a one-of-a-kind esports betting platform that
                was created with gamers in mind.
              </p>

              <p>
                We believe that betting should be safe and fair for the esports
                community. We believe in giving back and creating a healthy
                ecosystem where the players thrive.
              </p>

              <p>
                We are the only esports operator publicly listed on NASDAQ and
                backed by the world’s leading investors.
              </p>

              <p>
                We are in it for the long game and we are committed to going
                Beyond the Bet.
              </p>
            </>
          }
        />
      </>
    </>
  );
}

About.namespacesRequired = [...defaultNamespaces, "page-about"];

export default About;
