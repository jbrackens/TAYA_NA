import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function Cashier(props: PageProps) {
  return <Pages.Cashier {...props} />;
}

Cashier.getInitialProps = async () => ({
  namespacesRequired: Pages.Cashier.namespacesRequired,
  disableWebsocket: true,
  disableLayout: true,
  disableGeoComply: true,
});

export default Cashier;
