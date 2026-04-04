import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Limits(props: PageProps) {
  return <Components.Pages.Limits {...props} />;
}

Limits.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Limits.namespacesRequired,
});

export default Limits;
