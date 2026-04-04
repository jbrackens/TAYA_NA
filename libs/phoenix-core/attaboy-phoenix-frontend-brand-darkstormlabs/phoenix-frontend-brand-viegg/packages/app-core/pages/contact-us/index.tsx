import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function ContactUs(props: PageProps) {
  return <Pages.ContactUs {...props} />;
}

ContactUs.getInitialProps = async () => ({
  namespacesRequired: Pages.ContactUs.namespacesRequired,
});

export default ContactUs;
