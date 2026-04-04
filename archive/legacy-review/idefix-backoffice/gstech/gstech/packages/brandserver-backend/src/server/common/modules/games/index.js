/* @flow */
import type { GameLaunchOptions } from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameStartGameResponse } from "../../api";

const utils = require("../../utils");
const configuration = require('../../configuration');
const api = require('../../api');
const events = require('../events');
const logger = require('../../logger');
const temporaryForm = require('./temporary-form');

export type GameDef = {
  GameID: ?string,
  MobileGameID: ?string,
  Options: string[],
  Permalink: string,
  Manufacturer: string,
  Tags: string[],
  Thumbnail: string,
  Name: string,
  Meta: { [key: string]: any },
  ViewMode: string,
  BlockedCountries: CountryId[],
  Group?: string,
  Keywords: string,
  ManufacturerOverride: ?string,
  HasPlayForFun: boolean,
  New: boolean,
  Jackpot: boolean,
  Promoted: boolean,
  Category: string,
  SearchOnly: boolean,
  JackpotValue?: string,
  DropAndWins: boolean,
};
type LaunchGameResponse = {
  GameHTML: string,
  GameURL: string,
  MaltaJurisdiction: boolean,
  Options: Array<string>,
};
type GetAllGamesResponse = Array<{
  GameID: any,
  GameName: any,
  HasPlayForFun: 'true' | 'false',
  ManufacturerName: any,
  Mobile: any,
  Name: any,
  Permalink: any,
  BlockedCountries: CountryId[],
}>;

const getGameId = (req: express$Request, game: GameDef): ?string => {
  if (game.MobileGameID && req.context.mobile) {
    return game.MobileGameID;
  }
  return game.GameID;
};

const getGameOptions = (req: express$Request, game: GameDef): GameLaunchOptions => {
  const options: { [string]: boolean | string } = {};
  for (const key of Array.from(game.Options)) {
    const items = key.split('=');
    if (items.length === 2) {
      const [,i] = items;
      options[items[0]] = i;
    } else {
      options[key] = true;
    }
  }
  return {
    lobbyUrl: configuration.baseUrl('/loggedin/'),
    gameUrl: configuration.baseUrl(`/loggedin/game/${game.Permalink}/`),
    bankingUrl: configuration.baseUrl('/loggedin/myaccount/deposit/'),
    mobile: req.context.mobile,
    forceIframe: true,
    options,
  };
};

const returnGame = async (req: express$Request, game: GameDef, x: GameStartGameResponse) => {
  let { GameURL } = x;
  if (GameURL == null) {
    GameURL = await temporaryForm.addHtml(x.GameHTML);
  }
  const result = {
    MaltaJurisdiction: true,
    GameURL,
    GameHTML: x.GameHTML || `<iframe allow="autoplay" name="game-frame" src="${x.GameURL}" frameBoder: "0" seamless="seamless" allowtransparency="true" style="width:100%; height:100%;" />`,
    Options: game.Options || [],
  };
  logger.debug('ReturnGame', result);
  return result;
};

const launchGame = async (
  req: express$Request,
  game: GameDef,
): Promise<LaunchGameResponse> => {
  const opts = getGameOptions(req, game);
  const id = getGameId(req, game);
  if (id != null) {
    const gameOpts = await startGame(req, id, opts);
    return returnGame(req, game, gameOpts);
  }
  return Promise.reject('Invalid game');
};

const launchFreeGame = async (
  req: express$Request,
  game: GameDef,
): Promise<LaunchGameResponse> => {
  const opts = getGameOptions(req, game);
  const id = getGameId(req, game);
  if (id != null) {
    const gameOpts = await startGameForFunAsGuest(req, id, opts);
    return returnGame(req, game, gameOpts);
  }
  return Promise.reject('Invalid game');
};

const getAllGames = (): Promise<GetAllGamesResponse> => api.GameGetAllGames();

const startGameForFunAsGuest = async (req: express$Request, gameID: string, customOptions: any = {}) => {
  const client = {
    ipAddress: utils.getRemoteAddress(req),
    userAgent: req.headers['user-agent'],
    isMobile: req.context.mobile,
  };
  const res = await api.GameStartGamePlayForFunAsGuest({
    gameID,
    languageId: req.context.languageISO.toUpperCase(),
    currencyId: req.context.currencyISO,
    customOptions,
    client,
  });
  await events().startGameForFun(req, gameID);
  return res;
};

const startGame = async (req: express$Request, gameID: string, customOptions: any = {}) => {
  logger.debug('StartGame', { gameID, customOptions });
  const res = await api.GameStartGame({
    sessionKey: req.session.SessionKey,
    gameID,
    customOptions,
  });
  await events().startGame(req, gameID);
  return res;
};

module.exports = {
  getAllGames,
  launchGame,
  launchFreeGame,
};
