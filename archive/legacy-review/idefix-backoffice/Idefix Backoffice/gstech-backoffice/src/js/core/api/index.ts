import queryString from "query-string";
import kyc from "./kyc";
import locks from "./locks";
import photos from "./photos";
import players from "./players";
import reports from "./reports";
import settings from "./settings";
import authentication from "./authentication";
import users from "./users";
import campaigns from "./campaigns";
import { authenticationRequired } from "../../modules/authentication";
import { handlePlayerStatusUpdate } from "../../modules/player";
import { openDialog } from "../../dialogs";
import { Store } from "@reduxjs/toolkit";
import { FetchApi } from "./types";

export const PREFIX = "/api/v1";

let store: Store | null = null;
const initialize = (initializeStore: Store) => (store = initializeStore);

const handleResponse = (response: Response) => {
  if (response.status === 403) {
    store && store.dispatch(authenticationRequired() as any);
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json().then((res: Response) => Promise.reject(res));
    }
    return response.text().then((res: string) => Promise.reject(res));
  }

  if (response.status === 413) {
    store && store.dispatch(openDialog("bad-request", { message: response.statusText || "Too large file size" }));
    return response.json().then((res: Error) => Promise.reject(res));
  }

  if (response.status >= 200 && response.status < 300) {
    const result = response.json();
    return result.then(r => {
      if (r && r.update != null && store) {
        store.dispatch(handlePlayerStatusUpdate(r.update));
      }
      return r;
    });
  }
  // if (response.status >= 500) {
  //   store.dispatch(openDialog("network-failure", { message: response.statusText }));
  //   return Promise.reject(response);
  // }
  return response.json().then((res: Error) => Promise.reject(res));
};
const authorizationToken = (): string | undefined => {
  if (!store) {
    return undefined;
  }
  const state = store?.getState();
  if (state?.authentication?.token) {
    return `Token ${state.authentication.token}`;
  }
  return undefined;
};

const apiFetch: FetchApi = (defaultUrl, options = {}) => {
  const { params, ...restOptions } = options;

  const url = params ? `${defaultUrl}?${queryString.stringify(params)}` : defaultUrl;

  return fetch(url, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      Authorization: authorizationToken() as string,
      ...(restOptions && restOptions.headers),
    },
  })
    .then(handleResponse)
    .catch(error => {
      if (error instanceof Error) {
        store!.dispatch(openDialog("network-failure", { message: "Network connection failed" }));
      }
      return Promise.reject(error);
    });
};

export default {
  initialize,
  settings: settings(apiFetch),
  kyc: kyc(apiFetch),
  locks: locks(apiFetch),
  photos: photos(apiFetch, handleResponse, authorizationToken as () => string),
  players: players(apiFetch),
  reports: reports(apiFetch),
  authentication: authentication(apiFetch),
  users: users(apiFetch),
  campaigns: campaigns(apiFetch),
};
