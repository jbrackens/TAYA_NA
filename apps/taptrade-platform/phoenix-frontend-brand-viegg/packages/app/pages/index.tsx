import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Home(props: PageProps) {
  return <Components.Pages.Home {...props} />;
}

Home.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Home.namespacesRequired,
  disableLayout: true,
  disableWebsocket: true,
  enableLandingPage: true,
});

export default Home;
