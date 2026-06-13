import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function PrivacyPolicy(props: PageProps) {
  return <Components.Pages.PrivacyPolicy {...props} />;
}

PrivacyPolicy.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.PrivacyPolicy.namespacesRequired,
});

export default PrivacyPolicy;
