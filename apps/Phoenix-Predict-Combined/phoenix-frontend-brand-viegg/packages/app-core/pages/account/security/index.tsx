import Pages from "../../../components/pages";
import { PageProps } from "../../../components/pages/types";

function Security(props: PageProps) {
  return <Pages.Security {...props} />;
}

Security.getInitialProps = async () => ({
  namespacesRequired: Pages.Security.namespacesRequired,
});

export default Security;
