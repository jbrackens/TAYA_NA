import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Security(props: PageProps) {
  return <Components.Pages.Security {...props} />;
}

Security.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Security.namespacesRequired,
});

export default Security;
