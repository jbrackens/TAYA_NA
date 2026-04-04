import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function SportsbookLeaguePage(props: PageProps) {
  return <Components.Pages.ESportsBets {...props} />;
}

SportsbookLeaguePage.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.ESportsBets.namespacesRequired,
  layoutVariant: "sportsbook-redesign",
});

export default SportsbookLeaguePage;
