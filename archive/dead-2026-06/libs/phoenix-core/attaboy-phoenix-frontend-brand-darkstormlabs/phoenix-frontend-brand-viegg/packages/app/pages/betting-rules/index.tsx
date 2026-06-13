import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function BettingRules(props: PageProps) {
  return <Components.Pages.BettingRules {...props} />;
}

BettingRules.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.BettingRules.namespacesRequired,
});

export default BettingRules;
