import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function CashierTransaction(props: PageProps) {
  return <Components.Pages.CashierTransaction {...props} />;
}

CashierTransaction.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Cashier.namespacesRequired,
  disableWebsocket: true,
  disableLayout: true,
});

export default CashierTransaction;
