import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function SportsbookMarketPage(props: PageProps) {
  return <Components.Pages.Fixture {...props} />;
}

SportsbookMarketPage.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Fixture.namespacesRequired,
  layoutVariant: "sportsbook-redesign",
});

export default SportsbookMarketPage;
