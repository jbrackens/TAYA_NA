import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Settings(props: PageProps) {
  return <Components.Pages.Settings {...props} />;
}

Settings.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Settings.namespacesRequired,
});

export default Settings;
