/* @flow */
export type OkResult = {
  ok: boolean,
};

export type URLFork = {
  ok: string,
  failure: string,
};

export type URLResponse = {
  requiresFullscreen: boolean,
  url: string,
};

export type HTMLResponse = {
  requiresFullscreen: boolean,
  html: string,
};

export type DataResponse<T> = {
  data: T,
};
