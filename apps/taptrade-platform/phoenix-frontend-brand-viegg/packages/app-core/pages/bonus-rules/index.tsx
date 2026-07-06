import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function BonusRules(props: PageProps) {
  return <Pages.BonusRules {...props} />;
}

BonusRules.getInitialProps = async () => ({
  namespacesRequired: Pages.BonusRules.namespacesRequired,
});

export default BonusRules;
