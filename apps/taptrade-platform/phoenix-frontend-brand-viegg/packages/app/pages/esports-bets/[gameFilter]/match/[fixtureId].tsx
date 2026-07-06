import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function ESportsBetsLeagueDetails(props: PageProps) {
  return <Components.Pages.Fixture {...props} />;
}

ESportsBetsLeagueDetails.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Fixture.namespacesRequired,
});

export default ESportsBetsLeagueDetails;
