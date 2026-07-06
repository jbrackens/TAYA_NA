import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function ESportsBets(props: PageProps) {
  return <Components.Pages.ESportsBets {...props} />;
}

ESportsBets.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.ESportsBets.namespacesRequired,
});

export default ESportsBets;
