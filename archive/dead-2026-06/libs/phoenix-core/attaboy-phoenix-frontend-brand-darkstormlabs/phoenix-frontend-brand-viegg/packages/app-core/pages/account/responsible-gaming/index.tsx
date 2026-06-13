import Pages from "../../../components/pages";
import { PageProps } from "../../../components/pages/types";

function Limits(props: PageProps) {
  return <Pages.Limits {...props} />;
}

Limits.getInitialProps = async () => ({
  namespacesRequired: Pages.Limits.namespacesRequired,
});

export default Limits;
