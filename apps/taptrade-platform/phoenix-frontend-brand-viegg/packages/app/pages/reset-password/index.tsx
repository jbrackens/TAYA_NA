import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function ChangePassword(props: PageProps) {
  return <Components.Pages.ChangePassword {...props} />;
}

ChangePassword.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.ChangePassword.namespacesRequired,
});

export default ChangePassword;
