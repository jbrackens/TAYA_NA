import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function StreamBets(props: PageProps) {
  return <Components.Pages.StreamBets {...props} />;
}

StreamBets.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.StreamBets.namespacesRequired,
});

export default StreamBets;
