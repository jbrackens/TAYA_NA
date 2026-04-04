import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function About(props: PageProps) {
  return <Pages.About {...props} />;
}

About.getInitialProps = async () => ({
  namespacesRequired: Pages.About.namespacesRequired,
});

export default About;
