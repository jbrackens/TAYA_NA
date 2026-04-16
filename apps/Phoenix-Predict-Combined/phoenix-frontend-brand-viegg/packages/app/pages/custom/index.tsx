import Head from "next/head";
import { Components } from "@phoenix-ui/app";

export default function Custom() {
  return (
    <>
      <Head>
        <title>Sportsbook Shell Preview</title>
      </Head>
      <Components.Redesign.SportsbookAppShellPreview />
    </>
  );
}

Custom.getInitialProps = async () => ({
  disableLayout: true,
  disableWebsocket: true,
});
