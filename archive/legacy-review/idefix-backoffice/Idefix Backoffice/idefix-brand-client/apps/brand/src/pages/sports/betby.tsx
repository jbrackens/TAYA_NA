import { CmsPageOptions } from "@brandserver-client/types";
import { NonLoggedInHead } from "@brandserver-client/nonloggedin";
import { Registration } from "@brandserver-client/features/registration";
import {
  fetchCmsPageOptions,
  fetchFreeGames,
  getGames,
  getPageOptions,
  LobbyNextContext
} from "@brandserver-client/lobby";
// import { BetbyPage } from "@brandserver-client/features/betby";
import { VieState } from "../../redux";

interface PageProps {
  locale: string;
  pageOptions: CmsPageOptions;
}

function Betby({ locale, pageOptions }: PageProps) {
  return (
    <>
      <NonLoggedInHead pageOptions={pageOptions} />
      {/* <BetbyPage /> */}
      {pageOptions && pageOptions.formData && (
        <div style={{ display: "none" }}>
          <Registration pageOptions={pageOptions} language={locale} />
        </div>
      )}
    </>
  );
}

Betby.getInitialProps = async (ctx: LobbyNextContext<VieState>) => {
  const {
    query: { lang },
    lobby: { store }
  } = ctx;

  const promises = [];

  const games = getGames(store.getState());
  const cmsOptions = getPageOptions(store.getState());

  if (!cmsOptions) {
    promises.push(store.dispatch(fetchCmsPageOptions(`/${lang}`)));
  }

  if (!games.length) {
    promises.push(store.dispatch(fetchFreeGames(lang)));
  }

  await Promise.all(promises);

  const pageOptions = store.getState().cms.pageOptions;

  return {
    locale: lang,
    pageOptions
  };
};

export default Betby;
