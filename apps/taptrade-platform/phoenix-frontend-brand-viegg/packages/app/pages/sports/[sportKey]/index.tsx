import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function SportsbookSportPage(props: PageProps) {
  return <Components.Pages.ESportsBets {...props} />;
}

SportsbookSportPage.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.ESportsBets.namespacesRequired,
  layoutVariant: "sportsbook-redesign",
});

export default SportsbookSportPage;
