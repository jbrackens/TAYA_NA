import Head from "next/head";
import { Components } from "@phoenix-ui/app";

export default function Custom() {
  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <Components.Layout>
        <>
          <h1>Home</h1>
        </>
      </Components.Layout>
    </>
  );
}
