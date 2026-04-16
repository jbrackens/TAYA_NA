import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function ESportsBetsSportDetails(props: PageProps) {
  return <Components.Pages.ESportsBets {...props} />;
}

ESportsBetsSportDetails.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.ESportsBets.namespacesRequired,
});

export default ESportsBetsSportDetails;
