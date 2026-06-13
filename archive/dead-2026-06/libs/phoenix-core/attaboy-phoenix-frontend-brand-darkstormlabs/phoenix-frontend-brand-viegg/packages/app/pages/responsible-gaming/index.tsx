import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function ResponsibleGaming(props: PageProps) {
  return <Components.Pages.ResponsibleGaming {...props} />;
}

ResponsibleGaming.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.ResponsibleGaming.namespacesRequired,
});

export default ResponsibleGaming;
