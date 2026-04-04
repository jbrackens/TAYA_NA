import { CmsPageOptions } from "@brandserver-client/types";
import {
  fetchCmsPageOptions,
  fetchFreeGames,
  getGames,
  getPageOptions
} from "@brandserver-client/lobby";
import * as React from "react";
import styled from "styled-components";
import { NonLoggedInHead } from "@brandserver-client/nonloggedin";
import { Registration } from "@brandserver-client/features/registration";
import { LobbyNextContext } from "@brandserver-client/lobby";
import { VieState } from "../../redux";
import Games from "../../components/Games/Games";

const StyledGamePage = styled.div`
  background-color: ${({ theme }) => theme.palette.primaryLight};
  margin-top: 80px;
`;

interface Props {
  locale: string;
  pageOptions: CmsPageOptions;
}

function FreeGamesPage({ locale, pageOptions }: Props) {
  return (
    <StyledGamePage>
      <NonLoggedInHead pageOptions={pageOptions} />
      <Games />
      {pageOptions && pageOptions.formData && (
        <div style={{ display: "none" }}>
          <Registration pageOptions={pageOptions} language={locale} />
        </div>
      )}
    </StyledGamePage>
  );
}

FreeGamesPage.getInitialProps = async (ctx: LobbyNextContext<VieState>) => {
  const {
    query: { lang },
    lobby: { store }
  } = ctx;

  const games = getGames(store.getState());
  const cmsOptions = getPageOptions(store.getState());

  if (!cmsOptions) {
    await store.dispatch(fetchCmsPageOptions(`/${lang}`));
  }

  if (!games.length) {
    await store.dispatch(fetchFreeGames(lang));
  }

  const pageOptions = store.getState().cms.pageOptions;

  return {
    locale: lang,
    pageOptions
  };
};

export default FreeGamesPage;
