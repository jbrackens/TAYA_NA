import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function CashierTransactionCheque(props: PageProps) {
  return <Components.Pages.CashierTransactionCheque {...props} />;
}

CashierTransactionCheque.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Cashier.namespacesRequired,
  disableWebsocket: true,
  disableLayout: true,
});

export default CashierTransactionCheque;
