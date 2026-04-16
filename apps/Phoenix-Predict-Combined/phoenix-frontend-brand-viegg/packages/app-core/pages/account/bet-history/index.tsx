import Pages from "../../../components/pages";
import { PageProps } from "../../../components/pages/types";

function WinLossStatistics(props: PageProps) {
  return <Pages.WinLossStatistics {...props} />;
}

WinLossStatistics.getInitialProps = async () => ({
  namespacesRequired: Pages.WinLossStatistics.namespacesRequired,
});

export default WinLossStatistics;
