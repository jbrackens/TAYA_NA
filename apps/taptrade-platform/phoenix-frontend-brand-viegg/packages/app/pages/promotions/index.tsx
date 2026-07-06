import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Promotions(props: PageProps) {
  return <Components.Pages.Promotions {...props} />;
}

Promotions.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Promotions.namespacesRequired,
});

export default Promotions;
