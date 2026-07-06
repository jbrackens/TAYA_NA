import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function TermsAndConditions(props: PageProps) {
  return <Pages.TermsAndConditions {...props} />;
}

TermsAndConditions.getInitialProps = async () => ({
  namespacesRequired: Pages.TermsAndConditions.namespacesRequired,
});

export default TermsAndConditions;
