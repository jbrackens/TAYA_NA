import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function SelfExclude(props: PageProps) {
  return <Components.Pages.SelfExclude {...props} />;
}

SelfExclude.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.SelfExclude.namespacesRequired,
});

export default SelfExclude;
