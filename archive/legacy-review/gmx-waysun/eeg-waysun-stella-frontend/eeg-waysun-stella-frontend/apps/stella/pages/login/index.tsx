import Pages from "../../components/pages";
import { PageProps } from "../../components/pages/types";

function Login(props: PageProps) {
  return <Pages.Login {...props} />;
}

Login.getInitialProps = async () => ({
  disableLayout: true,
});

export default Login;
