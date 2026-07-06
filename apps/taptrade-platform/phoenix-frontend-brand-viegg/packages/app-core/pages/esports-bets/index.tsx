import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function ESportsBets(props: PageProps) {
  return <Pages.ESportsBets {...props} />;
}

ESportsBets.getInitialProps = async () => ({
  namespacesRequired: Pages.ESportsBets.namespacesRequired,
});

export default ESportsBets;
