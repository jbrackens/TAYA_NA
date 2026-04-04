import * as React from "react";
import { Api } from "@brandserver-client/api";
import {
  AppData,
  CmsPageOptions,
  Config,
  Profile,
  UpdateState
} from "@brandserver-client/types";
import { DocumentContext } from "next/document";
import { NextPageContext } from "next";
import { AppContext } from "next/app";
import { ActionCreator, AnyAction, Reducer, Store } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { DialogsType } from "../dialogs";
import { ErrorDialogState } from "../error-dialog";
import { GamesState } from "../games";
import { MobileMenuState } from "../mobile-menu";
import { LoginState } from "../login";
import { RegistrationState } from "../registration";
import { InfoDialogState } from "../info-dialog/duck";
import { ExclusionState } from "../exclusions";
import { GameState } from "../game";

export interface LobbyOptions {
  reducer: Reducer;
}

export type GetLobbyProps = { ctx?: NextPageContext; props?: any };

export interface Lobby<S> {
  store: Store<S, AnyAction> & {
    dispatch: ThunkDispatch<S, any, AnyAction>;
  };
  api: Api;
  intl: Intl;
  profile: Profile;
  config: Config;
}

export interface Intl {
  locale: string;
  messages: { [key: string]: string };
}

export type LobbyNextAppContext<S> = AppContext & {
  ctx: LobbyNextContext<S>;
};
export type LobbyNextContext<S> = NextPageContext & {
  lobby: Lobby<S>;
};

export type LobbyNextDocumentContext<S> = NextPageContext &
  DocumentContext & {
    lobby: Lobby<S>;
  };

export interface LobbyState {
  app: AppData;
  cms: { pageOptions: CmsPageOptions };
  dialogs: DialogsType;
  errorDialog: ErrorDialogState;
  infoDialog: InfoDialogState;
  games: GamesState;
  game: GameState;
  mobileMenuIsOpen: MobileMenuState;
  update: UpdateState;
  login: LoginState;
  registrationIsOpen: RegistrationState;
  exclusions: ExclusionState;
}

export type LobbyThunkActionCreator<R, S, A extends AnyAction> = ActionCreator<
  ThunkAction<R, S, ThunkExtraArgument, A>
>;

export interface ThunkExtraArgument {
  api: Api;
}

export type MyAccountLink = {
  Icon: React.FC<React.SVGAttributes<SVGSVGElement>>;
  href: string;
  text: string;
  className?: string;
  badge?: number;
};

export type MyAccountClientContext = {
  lobby: {
    api: Api;
    store: {
      dispatch: ThunkDispatch<LobbyState, any, AnyAction>;
    };
  };
  query: Record<string, string | string[] | undefined> | undefined;
};

export type MyAccountPage<
  CP = Record<string, unknown>,
  IP = Record<string, unknown>
> = React.ComponentType<CP> & {
  fetchInitialProps: (
    ctx: LobbyNextContext<LobbyState> | MyAccountClientContext
  ) => Promise<IP | undefined> | IP | undefined;
};
