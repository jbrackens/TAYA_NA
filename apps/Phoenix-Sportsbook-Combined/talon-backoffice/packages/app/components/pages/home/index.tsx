import { useRouter } from "next/router";
import { useEffect } from "react";
import { defaultNamespaces } from "../defaults";
import Pages from "..";
import { useState } from "react";

type HomeProps = {
  enableLandingPage: boolean;
};

function Home({ enableLandingPage }: HomeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enableLandingPage) {
      router.push("/esports-bets");
    } else {
      const token = localStorage.getItem("JdaToken");
      if (token) {
        router.push("/esports-bets");
      } else {
        setLoading(false);
      }
    }
  }, []);

  // this page will become the landing page and will only redirect to esports-bets after first visit
  return loading ? <></> : <Pages.LandingPage />;
}

Home.defaultProps = {
  enableLandingPage: false,
};

Home.namespacesRequired = [...defaultNamespaces];
export default Home;
