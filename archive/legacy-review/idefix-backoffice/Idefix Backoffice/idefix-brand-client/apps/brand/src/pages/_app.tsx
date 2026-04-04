import "react-toastify/dist/ReactToastify.css";
import App from "next/app";
import { ToastContainer } from "react-toastify";
import { Profile } from "@brandserver-client/types";
import { executeServerCallbacks } from "@brandserver-client/utils";
import {
  cleanScripts,
  createLobby,
  fetchInitData,
  getGames,
  Lobby,
  LobbyNextAppContext,
  LobbyProvider
} from "@brandserver-client/lobby";
import { VieState, rootReducer } from "../redux";
import NonLoggedInLayout from "../components/NonLoggedInLayout";
import LoggedInLayout from "../components/LoggedInLayout";
import { ThemeProvider } from "../ui/ThemeProvider";

const { getLobby, getLobbyProps } = createLobby<VieState>({
  reducer: rootReducer
});

interface Props {
  pageProps: any;
  profile: Profile;
  loggedIn: boolean;
  initialReduxState: VieState;
}

class MyApp extends App<Props> {
  static async getInitialProps({
    Component,
    ctx
  }: LobbyNextAppContext<VieState>) {
    const loggedIn = ctx.pathname.includes("/loggedin");
    ctx.lobby = getLobby({ ctx });

    const fetchInitialProps = async () => {
      if (!Component.getInitialProps) return {};
      return await Component.getInitialProps(ctx);
    };

    if (loggedIn) {
      const fetchGames = async () => {
        const games = getGames(ctx.lobby.store.getState());

        if (!games.length) {
          await ctx.lobby.store.dispatch(fetchInitData());
        }
      };

      const [pageProps] = await Promise.all([
        fetchInitialProps(),
        fetchGames()
      ]);

      return { pageProps, ...getLobbyProps(ctx.lobby), loggedIn };
    }

    const [pageProps] = await Promise.all([fetchInitialProps()]);

    return { pageProps, ...getLobbyProps(ctx.lobby), loggedIn };
  }

  componentDidMount() {
    const {
      initialReduxState: { update }
    } = this.props;

    executeServerCallbacks(update);
    this.lobby.store.dispatch(cleanScripts());
  }

  lobby: Lobby<VieState>;

  constructor(props: any) {
    super(props);
    this.lobby = getLobby({ props });
  }

  render() {
    const { Component, pageProps, loggedIn } = this.props;

    const lobby = this.lobby;
    const { profile, config } = lobby;

    const defaultLocale = config?.languages[0]?.code;

    return (
      <LobbyProvider lobby={lobby} defaultLocale={defaultLocale}>
        <ThemeProvider config={config}>
          <ToastContainer />
          {loggedIn ? (
            <LoggedInLayout profile={profile}>
              <Component {...pageProps} />
            </LoggedInLayout>
          ) : (
            <NonLoggedInLayout>
              <Component {...pageProps} />
            </NonLoggedInLayout>
          )}
        </ThemeProvider>
      </LobbyProvider>
    );
  }
}

export default MyApp;
