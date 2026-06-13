import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function About(props: PageProps) {
  return <Components.Pages.About {...props} />;
}

About.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.About.namespacesRequired,
});

export default About;
