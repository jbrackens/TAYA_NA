import Pages from "../../../components/pages";
import { PageProps } from "../../../components/pages/types";

function RgHistory(props: PageProps) {
  return <Pages.RgHistory {...props} />;
}

RgHistory.getInitialProps = async () => ({
  namespacesRequired: Pages.RgHistory.namespacesRequired,
});

export default RgHistory;
