import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function ContactUs(props: PageProps) {
  return <Components.Pages.ContactUs {...props} />;
}

ContactUs.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.ContactUs.namespacesRequired,
});

export default ContactUs;
