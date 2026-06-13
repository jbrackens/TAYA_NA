import Pages from "../../../../components/pages";
import { PageProps } from "../../../../components/pages/types";

function SelfExclude(props: PageProps) {
  return <Pages.SelfExclude {...props} />;
}

SelfExclude.getInitialProps = async () => ({
  namespacesRequired: Pages.SelfExclude.namespacesRequired,
});

export default SelfExclude;
