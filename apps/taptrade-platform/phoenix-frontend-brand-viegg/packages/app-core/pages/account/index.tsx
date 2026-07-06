import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function Account(props: PageProps) {
  return <Pages.Account {...props} />;
}

Account.getInitialProps = async () => {
  return {
    namespacesRequired: Pages.Account.namespacesRequired,
  };
};

export default Account;
