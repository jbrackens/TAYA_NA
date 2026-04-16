import Pages from "../components/pages";
import { PageProps } from "../components/pages/types";
import { defaultNamespaces } from "../components/pages/defaults";

function Home(props: PageProps) {
  return <Pages.Home {...props} />;
}

Home.getInitialProps = async () => ({
  namespacesRequired: [...defaultNamespaces],
  disableLayout: true,
  disableWebsocket: true,
  enableLandingPage: false,
});

export default Home;
