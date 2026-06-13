import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Cashier(props: PageProps) {
  return <Components.Pages.Cashier {...props} />;
}

Cashier.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Cashier.namespacesRequired,
  disableWebsocket: true,
  disableLayout: true,
});

export default Cashier;
