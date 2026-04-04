import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function ResponsibleGaming(props: PageProps) {
  return <Pages.ResponsibleGaming {...props} />;
}

ResponsibleGaming.getInitialProps = async () => ({
  namespacesRequired: Pages.ResponsibleGaming.namespacesRequired,
});

export default ResponsibleGaming;
