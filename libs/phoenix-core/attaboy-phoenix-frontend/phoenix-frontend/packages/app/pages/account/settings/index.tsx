import Pages from "../../../components/pages";
import { PageProps } from "../../../components/pages/types";

function Settings(props: PageProps) {
  return <Pages.Settings {...props} />;
}

Settings.getInitialProps = async () => ({
  namespacesRequired: Pages.Settings.namespacesRequired,
});

export default Settings;
