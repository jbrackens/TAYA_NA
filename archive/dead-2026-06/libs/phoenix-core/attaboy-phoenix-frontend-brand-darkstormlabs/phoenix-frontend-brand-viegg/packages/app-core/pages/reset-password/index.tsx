import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function ChangePassword(props: PageProps) {
  return <Pages.ChangePassword {...props} />;
}

ChangePassword.getInitialProps = async () => ({
  namespacesRequired: Pages.ChangePassword.namespacesRequired,
});

export default ChangePassword;
