import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function StreamBets(props: PageProps) {
  return <Pages.StreamBets {...props} />;
}

StreamBets.getInitialProps = async () => ({
  namespacesRequired: Pages.StreamBets.namespacesRequired,
});

export default StreamBets;
