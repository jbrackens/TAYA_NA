import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function ESportsBetsLeagueDetails(props: PageProps) {
  return <Components.Pages.ESportsBets {...props} />;
}

ESportsBetsLeagueDetails.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.ESportsBets.namespacesRequired,
});

export default ESportsBetsLeagueDetails;
