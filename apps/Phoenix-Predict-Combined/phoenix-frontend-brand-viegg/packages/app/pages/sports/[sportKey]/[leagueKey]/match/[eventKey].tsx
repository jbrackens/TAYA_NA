import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function SportsbookMatchPage(props: PageProps) {
  return <Components.Pages.Fixture {...props} />;
}

SportsbookMatchPage.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Fixture.namespacesRequired,
  layoutVariant: "sportsbook-redesign",
});

export default SportsbookMatchPage;
