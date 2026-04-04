import Pages from "../../../components/pages";
import { PageProps } from "../../../components/pages/types";

function CashierTransaction(props: PageProps) {
  return <Pages.CashierTransaction {...props} />;
}

CashierTransaction.getInitialProps = async () => ({
  namespacesRequired: Pages.Cashier.namespacesRequired,
  disableWebsocket: true,
  disableLayout: true,
  disableGeoComply: true,
});

export default CashierTransaction;
