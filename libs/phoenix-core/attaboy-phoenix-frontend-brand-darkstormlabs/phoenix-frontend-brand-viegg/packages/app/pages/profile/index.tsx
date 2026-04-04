import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function Profile(props: PageProps) {
  return <Components.Pages.Profile {...props} />;
}

Profile.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Profile.namespacesRequired,
});

export default Profile;
