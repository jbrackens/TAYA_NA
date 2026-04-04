/* @flow */
const config = require('../config');
const request = require('../request')('complianceserver-api', config.api.complianceServer.private);

export type CheckSanctionRequest = {
  name: string,
};

export type CheckSanctionResponse = {
  matched: boolean,
  metadata: {
    UN: string,
    US: string,
    EU: string,
  },
  match?: string,
  list?: string,
};

export type SanctionMatch = {
  id: any,
  match: { [term: string]: string[] },
  queryTerms: string[],
  score: number,
  terms: string[],
  name: string,
  list: string,
  reference: string,
  aliases: string[],
  addresses: {
    street?: string,
    city?: string,
    country?: string,
    postCode?: string,
  }[],
  dateOfBirths: {
    type: string,
    date?: string,
    year?: string,
    from?: string,
    to?: string,
  }[],
};

export type CheckMultipleSanctionResponse = {
  matched: boolean,
  metadata: {
    UN: string,
    US: string,
    EU: string,
  },
  matches?: SanctionMatch[],
};

export type EmailCheckResponse = {
  ok: boolean,
  suggestion?: string,
};

export type CheckIpResponse = {
  matched: boolean,
  vpn?: boolean,
  tor?: boolean
};

const checkIp = (ip: IPAddress): Promise<CheckIpResponse> =>
  request('POST', '/check/ip', { ip });

const checkSanction = (data: CheckSanctionRequest): Promise<CheckSanctionResponse> =>
  request('POST', '/check/sanction', data);

const checkMultipleSanction = (data: CheckSanctionRequest): Promise<CheckMultipleSanctionResponse> =>
  request('POST', '/check/multiplesanction', data);

const emailCheck = (email: string): Promise<EmailCheckResponse> =>
  request('POST', '/check/email', { email });

module.exports = {
  checkIp,
  checkSanction,
  checkMultipleSanction,
  emailCheck,
};
