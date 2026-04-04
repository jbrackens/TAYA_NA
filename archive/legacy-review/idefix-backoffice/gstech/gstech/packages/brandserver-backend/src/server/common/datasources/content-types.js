/* @flow */

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
    lastDeposit?: number,
  },
  [lang: string]: {
    title: string,
    content: string,
    disclaimer: string,
    actiontext: string,
  }
};
