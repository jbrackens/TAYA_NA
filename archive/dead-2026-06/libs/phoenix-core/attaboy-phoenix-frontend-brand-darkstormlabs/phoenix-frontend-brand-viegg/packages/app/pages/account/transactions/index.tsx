import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function TransactionHistory(props: PageProps) {
  return <Components.Pages.TransactionHistory {...props} />;
}

TransactionHistory.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.TransactionHistory.namespacesRequired,
});

export default TransactionHistory;
