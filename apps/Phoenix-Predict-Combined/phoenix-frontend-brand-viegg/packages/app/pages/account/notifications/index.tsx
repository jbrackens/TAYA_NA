import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Notifications(props: PageProps) {
  return <Components.Pages.Notifications {...props} />;
}

Notifications.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Notifications.namespacesRequired,
});

export default Notifications;
