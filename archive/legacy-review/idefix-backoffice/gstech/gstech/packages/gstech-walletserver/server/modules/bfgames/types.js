/* @flow */

export type BFCommonRequest = {
  args: {
    caller_id: string,
    caller_password: string,
    token: string,
    game_ref: string,
    action_id: string,
    rollback_action_id: string,
    round_id: string,
    amount: number,
    offline: boolean,
    currency: string,
    bonus_instance_id: string,
  },
  methodname: string,
  mirror: {
    id: number,
  },
  type: string,
  version: string,
};

export type BFCommonResponse = {
  methodname: string,
  reflection: {
    id: number,
  },
  servicenumber: number,
  servicename: string,
  result: {
    errorcode: ?number,
    token?: string,
    ...
  },
  type: string,
  version: string
};

export type BFCommonError = {
  methodname: string,
  reflection: {
    id: number,
  },
  servicenumber: number,
  servicename: string,
  result: {
    errorcode: ?number,
  },
  type: string,
  version: string,
};
