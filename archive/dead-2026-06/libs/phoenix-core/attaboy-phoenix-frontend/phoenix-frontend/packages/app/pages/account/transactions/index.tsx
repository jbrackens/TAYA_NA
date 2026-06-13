import Pages from "../../../components/pages";
import { PageProps } from "../../../components/pages/types";

function TransactionHistory(props: PageProps) {
  return <Pages.TransactionHistory {...props} />;
}

TransactionHistory.getInitialProps = async () => ({
  namespacesRequired: Pages.TransactionHistory.namespacesRequired,
});

export default TransactionHistory;
