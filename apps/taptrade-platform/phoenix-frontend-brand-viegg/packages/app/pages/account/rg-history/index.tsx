import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function RgHistory(props: PageProps) {
  return <Components.Pages.RgHistory {...props} />;
}

RgHistory.getInitialProps = async () => ({
  namespacesRequired: (Components.Pages.RgHistory as any).namespacesRequired,
});

export default RgHistory;
