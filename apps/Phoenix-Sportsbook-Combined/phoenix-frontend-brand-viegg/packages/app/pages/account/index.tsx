import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Account(props: PageProps) {
  return <Components.Pages.Account {...props} />;
}

Account.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Account.namespacesRequired,
});

export default Account;
