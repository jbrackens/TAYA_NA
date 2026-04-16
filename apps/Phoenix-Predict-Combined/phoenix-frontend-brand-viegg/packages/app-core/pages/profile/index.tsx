import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function Profile(props: PageProps) {
  return <Pages.Profile {...props} />;
}

Profile.getInitialProps = async () => ({
  namespacesRequired: Pages.Profile.namespacesRequired,
});

export default Profile;
