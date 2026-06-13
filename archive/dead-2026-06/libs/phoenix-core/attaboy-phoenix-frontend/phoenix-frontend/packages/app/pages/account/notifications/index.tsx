import Pages from "../../../components/pages";
import { PageProps } from "../../../components/pages/types";

function Notifications(props: PageProps) {
  return <Pages.Notifications {...props} />;
}

Notifications.getInitialProps = async () => ({
  namespacesRequired: Pages.Notifications.namespacesRequired,
});

export default Notifications;
