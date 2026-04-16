import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function WinLossStatistics(props: PageProps) {
  return <Components.Pages.WinLossStatistics {...props} />;
}

WinLossStatistics.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.WinLossStatistics.namespacesRequired,
});

export default WinLossStatistics;
