import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function Promotions(props: PageProps) {
  return <Pages.Promotions {...props} />;
}

Promotions.getInitialProps = async () => ({
  namespacesRequired: Pages.Promotions.namespacesRequired,
});

export default Promotions;
