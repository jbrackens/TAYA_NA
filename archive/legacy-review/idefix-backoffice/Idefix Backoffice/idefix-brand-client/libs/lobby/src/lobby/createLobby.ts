import API, { Api, ApiError } from "@brandserver-client/api";
import { isServer } from "@brandserver-client/utils";
import { openErrorDialog } from "../error-dialog/duck";
import { receiveUpdate } from "../update";
import createStore from "./createStore";
import { GetLobbyProps, Lobby, LobbyOptions } from "./types";

function initializeLobby<S>(
  { ctx, props }: GetLobbyProps,
  { reducer }: LobbyOptions
): Lobby<S> {
  const thunkExtraArgument = {};

  const { intl, config, profile } = ctx ? ctx.req : props;

  const store = createStore(
    reducer,
    props && props.initialReduxState,
    thunkExtraArgument as { api: Api }
  );
  const api = API.create({
    req: ctx ? ctx.req : undefined,
    res: ctx ? ctx.res : undefined,
    locale: intl ? intl.locale : "en",
    onReceiveUpdate: (update: any) => store.dispatch(receiveUpdate(update)),
    onError: (error: ApiError) => store.dispatch(openErrorDialog(error))
  });

  // redux requires api instance to provide it for redux-thunk actions,
  // api requires redux instance to dispatch error actions when request fails.
  // To solve circular dependency we create empty thunkExtraArgument object,
  // pass it to redux initializer and immediately update it with instance of api
  (thunkExtraArgument as { api: Api }).api = api;

  return {
    store,
    api,
    intl,
    config,
    profile
  };
}

export const createLobby = <S>(options: LobbyOptions) => {
  let lobby: Lobby<S> | null = null;

  return {
    getLobby: (getLobbyProps: GetLobbyProps): Lobby<S> => {
      if (isServer || !lobby) {
        lobby = initializeLobby<S>(getLobbyProps, options);
      }

      return lobby;
    },
    getLobbyProps: (lobby: Lobby<S>) => {
      return {
        initialReduxState: lobby.store.getState(),
        intl: lobby.intl,
        profile: lobby.profile,
        config: lobby.config
      };
    }
  };
};
