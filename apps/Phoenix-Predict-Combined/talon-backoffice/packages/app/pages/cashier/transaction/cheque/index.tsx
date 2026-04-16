import Pages from "../../../../components/pages";
import { PageProps } from "../../../../components/pages/types";

function CashierTransactionCheque(props: PageProps) {
  return <Pages.CashierTransactionCheque {...props} />;
}

CashierTransactionCheque.getInitialProps = async () => ({
  namespacesRequired: Pages.Cashier.namespacesRequired,
  disableWebsocket: true,
  disableLayout: true,
  disableGeoComply: true,
});

export default CashierTransactionCheque;
