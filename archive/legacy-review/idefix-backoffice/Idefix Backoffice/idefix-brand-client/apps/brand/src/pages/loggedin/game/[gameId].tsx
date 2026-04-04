import * as React from "react";
import { useRouter } from "next/router";
import { GameModal } from "@brandserver-client/lobby";
import Head from "next/head";
import { trimLink } from "@brandserver-client/utils";

const GamePage = () => {
  const {
    query: { gameId },
    asPath
  } = useRouter();

  const canonicalPath = trimLink(asPath);

  return (
    <>
      <Head>
        <link
          rel="canonical"
          href={`${process.env.NEXT_PUBLIC_BRAND_URL}${canonicalPath}`}
        />
      </Head>
      <GameModal gameId={gameId as string} />
    </>
  );
};

export default GamePage;
