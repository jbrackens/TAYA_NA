import Pages from "../components/pages";
import { PageProps } from "../components/pages/types";

function Home(props: PageProps) {
  return <Pages.Home {...props} />;
}

export default Home;
