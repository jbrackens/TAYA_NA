import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function BettingRules(props: PageProps) {
  return <Pages.BettingRules {...props} />;
}

BettingRules.getInitialProps = async () => ({
  namespacesRequired: Pages.BettingRules.namespacesRequired,
});

export default BettingRules;
