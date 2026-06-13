import Head from "next/head";
import { defaultNamespaces } from "../defaults";

function StreamBets() {
  return (
    <>
      <Head>
        <title>Stream bets</title>
      </Head>
      <>
        <h1>Stream bets</h1>
      </>
    </>
  );
}

StreamBets.namespacesRequired = [...defaultNamespaces];

export default StreamBets;
