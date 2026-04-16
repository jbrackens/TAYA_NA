import { useRouter } from "next/router";
import { useEffect } from "react";
import { defaultNamespaces } from "../defaults";
import Pages from "..";
import {
  allowsLandingExperience,
  parseIntegrationMode,
} from "../../../lib/integration-mode";

const {
  SPORTSBOOK_INTEGRATION_MODE,
} = require("next/config").default().publicRuntimeConfig;

type HomeProps = {
  enableLandingPage: boolean;
};

function Home({ enableLandingPage }: HomeProps) {
  const router = useRouter();
  const integrationMode = parseIntegrationMode(SPORTSBOOK_INTEGRATION_MODE);
  const shouldShowLandingPage =
    enableLandingPage && allowsLandingExperience(integrationMode);

  useEffect(() => {
    if (!shouldShowLandingPage) {
      router.push("/sports/home");
      return;
    }
  }, [shouldShowLandingPage, router]);

  // this page will become the landing page and will only redirect to esports-bets after first visit
  if (!shouldShowLandingPage) {
    return <></>;
  }

  return <Pages.LandingPage />;
}

Home.defaultProps = {
  enableLandingPage: false,
};

Home.namespacesRequired = [...defaultNamespaces];
export default Home;
