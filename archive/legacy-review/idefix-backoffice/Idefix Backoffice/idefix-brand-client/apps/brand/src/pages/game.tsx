import * as React from "react";
import { useRouter } from "next/router";
import {
  fetchCmsPageOptions,
  GameModal,
  getPageOptions,
  LobbyNextContext
} from "@brandserver-client/lobby";
import { CmsPageOptions } from "@brandserver-client/types";
import { GameSeo } from "@brandserver-client/nonloggedin";
import { Registration } from "@brandserver-client/features/registration";
import { VieState } from "../redux";

interface Props {
  pageOptions: CmsPageOptions;
}

function GamePage({ pageOptions }: Props) {
  const {
    query: { game, lang }
  } = useRouter();

  return (
    <>
      <GameSeo />
      <GameModal gameId={game as string} />
      {pageOptions && pageOptions.formData && (
        <div style={{ display: "none" }}>
          <Registration pageOptions={pageOptions} language={lang as string} />
        </div>
      )}
    </>
  );
}

GamePage.getInitialProps = async (ctx: LobbyNextContext<VieState>) => {
  const {
    query: { lang },
    lobby: { store }
  } = ctx;

  const cmsOptions = getPageOptions(store.getState());

  if (!cmsOptions) {
    await store.dispatch(fetchCmsPageOptions(`/${lang}`));
  }

  const pageOptions = store.getState().cms.pageOptions;

  return { pageOptions };
};

export default GamePage;
