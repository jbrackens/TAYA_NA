import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function PrivacyPolicy(props: PageProps) {
  return <Pages.PrivacyPolicy {...props} />;
}

PrivacyPolicy.getInitialProps = async () => ({
  namespacesRequired: Pages.PrivacyPolicy.namespacesRequired,
});

export default PrivacyPolicy;
