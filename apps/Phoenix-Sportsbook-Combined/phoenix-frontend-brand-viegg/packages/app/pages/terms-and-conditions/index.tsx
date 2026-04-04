import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function TermsAndConditions(props: PageProps) {
  return <Components.Pages.TermsAndConditions {...props} />;
}

TermsAndConditions.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.TermsAndConditions.namespacesRequired,
});

export default TermsAndConditions;
