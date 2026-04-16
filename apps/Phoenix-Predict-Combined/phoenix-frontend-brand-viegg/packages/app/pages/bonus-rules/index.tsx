import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function BonusRules(props: PageProps) {
  return <Components.Pages.BonusRules {...props} />;
}

BonusRules.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.BonusRules.namespacesRequired,
});

export default BonusRules;
