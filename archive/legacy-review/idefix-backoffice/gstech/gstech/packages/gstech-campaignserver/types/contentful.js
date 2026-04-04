/* @flow */

export type Mailer = {
  id: string,
  image: string,
  type: ?string,
  lander: ?string,
  [lang: string]: {
    subject: string,
    text: string,
  }
};

export type Notification = {
  id: string,
  action: string,
  enabled: boolean,
  image?: string,
  type?: string,
  openOnLogin: boolean,
  important: boolean,
  rules: {
    priority: ?number,
    bonus: ?string,
    tags: string[],
    promotion: ?string,
    depleted: ?number,
    depletionTime?: number,
    lastDeposit?: number,
  },
  [lang: string]: {
    title: string,
    content: string,
  }
};

export type Message = {
  type: string,
  [lang: string]: {
    text: string,
  }
};
