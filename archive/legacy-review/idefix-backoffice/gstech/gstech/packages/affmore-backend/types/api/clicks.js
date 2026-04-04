/* @flow */

export type ClickRequest = {
  headers: {
    'user-agent': string,
    referrer?: string,
  },
  params: {
    brandNumber: number,
    code: string,
    segment?: string,
  },
  query?: {
    rid?: string,
    segment?: string,
    ...
  },
};

export type RefRequest = {
  params: {
    code: string,
  },
  query: {
    url: string,
    ...
  },
};
