import queryString from "query-string";
import { Store } from "@reduxjs/toolkit";

import { DIALOG } from "@idefix-backoffice/idefix/types";
import kyc from "./kyc";
import locks from "./locks";
import photos from "./photos";
import players from "./players";
import reports from "./reports";
import settings from "./settings";
import authentication from "./authentication";
import users from "./users";
import campaigns from "./campaigns";
import { FetchApi } from "./types";

export const PREFIX = "/api/v1";

// TODO replace native fetch with axios

let store: Store | null = null;
let actions: { requireAuthAction: any; openDialog: any; handlePlayerStatusUpdate: any } | null = null;
// TODO find another approach for this action
const initialize = ({ initializeStore, requireAuthAction, openDialog, handlePlayerStatusUpdate }: any) => {
  store = initializeStore;
  actions = { requireAuthAction, openDialog, handlePlayerStatusUpdate };
};

const handleResponse = (response: Response) => {
  if (response.status === 403) {
    store && actions && store.dispatch(actions.requireAuthAction());
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json().then((res: Response) => Promise.reject(res));
    }
    return response.text().then((res: string) => Promise.reject(res));
  }

  if (response.status === 413) {
    store &&
      actions &&
      store.dispatch(actions.openDialog(DIALOG.BAD_REQUEST, { message: response.statusText || "Too large file size" }));
    return response.json().then((res: Error) => Promise.reject(res));
  }

  if (response.status >= 200 && response.status < 300) {
    const result = response.json();
    return result.then(r => {
      if (r && r.update != null && store && actions) {
        store.dispatch(actions.handlePlayerStatusUpdate(r.update));
      }
      return r;
    });
  }

  // if (response.status >= 500) {
  //   store && store.dispatch(dialogsSlice.openDialog(DIALOG.NETWORK_FAILURE, { message: response.statusText }));
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
      ...(restOptions && restOptions.headers)
    }
  })
    .then(handleResponse)
    .catch(error => {
      if (error instanceof Error) {
        store &&
          actions &&
          store.dispatch(actions.openDialog(DIALOG.NETWORK_FAILURE, { message: "Network connection failed" }));
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
  campaigns: campaigns(apiFetch)
};
