/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
  RegisterRequest,
  RegisterResponse,
  IdentifyRequest,
  IdentifyResponse,
  LoginRequest,
  LoginResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { FinnishBank } from 'gstech-core/modules/constants';
import type { PaymentProviderApi } from '../../types';
import type { TrustlyMode } from './types';

const IBAN = require('iban');
const { v1: uuid } = require('uuid');

const client = require('gstech-core/modules/clients/backend-payment-api');
const money = require('gstech-core/modules/money');
const { guard } = require('gstech-core/modules/utils');
const { encrypt } = require('gstech-core/modules/miserypt');

const trustlyClearingHouses = require('gstech-core/modules/trustlyClearingHouses');
const config = require('../../../config');
const trustlies = require('./trustly');

const notificationUrl = (target: string) => config.server.public + target;

const bankMapping: { [FinnishBank]: string } = {
  op: 'deposit.bank.finland.okoy_bankbutton',
  nordea: 'deposit.bank.finland.ndea_bankbutton',
  danske: 'deposit.bank.finland.daba_bankbutton',
  saastopankki: 'deposit.bank.finland.itel_bankbutton',
  aktia: 'deposit.bank.finland.hels_bankbutton',
  pop: 'deposit.bank.finland.popf_bankbutton',
  handelsbanken: 'deposit.bank.finland.hand_bankbutton',
  spankki: 'deposit.bank.finland.sban_bankbutton',
  alandsbanken: 'deposit.bank.finland.aaba_bankbutton',
  omasp: 'deposit.bank.finland.omsp_bankbutton',
};

const getMode = (request: DepositRequest | RegisterRequest): TrustlyMode => {
  if (request.player.countryId === 'FI' && request.params && request.params.selectedBank) {
    return 'bank';
  }

  return 'standard';
};

const depositInternal = async (
  depositRequest: DepositRequest | RegisterRequest | IdentifyRequest | LoginRequest,
  mode: TrustlyMode,
  requestKYC: boolean = false,
  noAmount: boolean = false,
): Promise<DepositResponse> => {
  const { player, urls } = depositRequest;
  const trustlyMode =
    config.providers.trustly.brandsAccounts[depositRequest.player.brandId] || mode;
  // $FlowFixMe[invalid-computed-prop]
  const trustly = trustlies[trustlyMode];

  const data: any = {
    NotificationURL: notificationUrl(`/api/v1/trustly/process/deposit/${player.brandId}/${mode}`),
    EndUserID: player.username,
  };
  if (depositRequest.deposit) {
    data.MessageID = depositRequest.deposit.transactionKey;
  }
  if (depositRequest.identify) {
    data.NotificationURL = notificationUrl(
      `/api/v1/trustly/process/identify/${encodeURIComponent(
        encrypt(player.username, config.publicKey),
      )}`,
    );
    data.MessageID = uuid();
  }

  const attributes: any = {
    Locale: `${player.languageId}_${player.countryId}`,
    Country: player.countryId,
    Currency: player.currencyId,
    SuccessURL: urls.ok,
    FailURL: urls.failure,
  };
  if (depositRequest.deposit && !noAmount) {
    attributes.Amount = money.asFloat(depositRequest.deposit.amount).toString();
  }

  if (player.firstName) {
    attributes.Firstname = player.firstName;
  }

  if (player.lastName) {
    attributes.Lastname = player.lastName;
  }

  if (player.email) {
    attributes.Email = player.email;
  }

  if (mode === 'bank') {
    const d: DepositRequest = (depositRequest: any);
    const method = bankMapping[d.params.selectedBank];
    if (!method) throw new Error(`Bank '${d.params.selectedBank}' not found in the mapping`);
    attributes.Method = method;
  }

  if (requestKYC) {
    attributes.RequestKYC = '1';
  }

  const response = await trustly.deposit(data, attributes);
  const depositResponse: DepositResponse = {
    requiresFullscreen: false,
    url: response.url,
  };

  return depositResponse;
};

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  const mode = getMode(depositRequest);
  const result = depositInternal(depositRequest, mode);
  return result;
};

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {
  const { player, withdrawal } = withdrawRequest;
  const { accountParameters } = withdrawal;
  const mode: TrustlyMode = (accountParameters && accountParameters.trustlyMode) || 'standard'; // TODO: need to pick default trustlyMode
  const trustlyMode = config.providers.trustly.brandsAccounts[withdrawRequest.player.brandId] || mode;
  // $FlowFixMe[invalid-computed-prop]
  const trustly = trustlies[trustlyMode];

  const balance = await trustly.balance();
  const [balanceItem] = balance.filter(b => b.currency === player.currencyId);
  if (!balanceItem) {
    const result: WithdrawResponse = {
      ok: true,
      message: `Currency ${player.currencyId} not supported by Trustly`,
      reject: true,
      complete: false,
    };
    return result;
  }
  const currentBalance = money.parseMoney(balanceItem.balance);

  if (balanceItem && currentBalance < withdrawal.amount) {
    const result: WithdrawResponse = {
      ok: true,
      message: 'Not enough money on merchants trustly account to payout to player\'s trustly account.',
      reject: true,
      complete: false,
    };

    return result;
  }

  let trustlyAccountId = accountParameters && accountParameters.trustlyAccountId;
  let trustlyAccountNumber = (accountParameters && accountParameters.trustlyAccountNumber) || '';
  if (!trustlyAccountId || (trustlyAccountNumber && withdrawal.account !== trustlyAccountNumber)) {
    const isValidIBAN = IBAN.isValid(withdrawal.account);
    trustlyAccountNumber = withdrawal.account;

    let accountNumber;
    let bankNumber;
    let clearingHouse;

    if (isValidIBAN) {
      bankNumber = '';
      accountNumber = IBAN.electronicFormat(trustlyAccountNumber);
      const ch = Object.keys(trustlyClearingHouses).find(r => accountNumber.match(trustlyClearingHouses[r]));
      if (!ch) throw Error(`Withdrawal account format is a valid IBAN, but not supported by Trustly. Withdrawal account for this country should be in BankNumber / AccountNumber format: ${trustlyAccountNumber}`);
      clearingHouse = ch;
    } else {
      const bankData = trustlyAccountNumber.split('/').map(item => item.trim());
      if (bankData.length !== 2) throw Error(`Withdrawal account format is not recognized: ${trustlyAccountNumber}`);

      [bankNumber, accountNumber] = bankData;
      clearingHouse = 'SWEDEN'; // if account is not iban, we assume it is SWEDEN
    }

    const data = {
      AccountNumber: accountNumber,
      BankNumber: bankNumber,
      ClearingHouse: clearingHouse,
      EndUserID: player.username,
      Firstname: player.firstName,
      Lastname: player.lastName,
    };

    const attributes: any = {
      AddressCountry: player.countryId,
      AddressPostalCode: player.postCode,
      AddressCity: player.city,
      AddressLine1: player.address,
      MobilePhone: player.mobilePhone,
      Email: player.email,
      DateOfBirth: player.dateOfBirth,
    };

    if (player.nationalId != null) {
      attributes.NationalIdentificationNumber = player.nationalId;
    }

    try {
      const response = await trustly.request('RegisterAccount', data, attributes);
      trustlyAccountId = response.accountid;
    } catch (e) {
      if (guard(e, g => g.lastResponse.error.code) === 624) {
        const result: WithdrawResponse = {
          message: 'Failed to register IBAN account on Trustly side.',
          ok: false,
          reject: true,
          complete: false,
        };

        return result;
      }

      if (guard(e, g => g.lastResponse.error.code) === 637) {
        const result: WithdrawResponse = {
          message: 'Mark Trustly duplicate withdrawal as completed.',
          ok: true,
          reject: false,
          complete: true,
        };

        return result;
      }

      throw e;
    }

    await client.updateAccountParameters(player.username, withdrawal.accountId, {
      parameters: {
        trustlyAccountId,
        trustlyAccountNumber,
      },
    });
  }

  const data = {
    NotificationURL: notificationUrl(`/api/v1/trustly/process/payout/${player.brandId}/${mode}`),
    EndUserID: player.username,
    MessageID: withdrawal.transactionKey,
    Currency: player.currencyId,
    Amount: money.formatMoney(withdrawal.amount).toString(),
    AccountID: trustlyAccountId,
  };

  const attributes = {
    SenderInformation: {
      Firstname: player.firstName,
      Lastname: player.lastName,
    },
  };

  const response = await trustly.accountPayout(data, attributes);
  const result: WithdrawResponse = {
    ok: true,
    message: 'Account Payout',
    reject: response.result !== '1',
    id: response.orderid,
    complete:
    response.result === '1',
  };

  return result;
};

const identify = async (identifyRequest: IdentifyRequest): Promise<IdentifyResponse> => {  
  const result: IdentifyResponse = await depositInternal(identifyRequest, 'pnp', true);
  return result;
};

const register = async (registerRequest: RegisterRequest): Promise<RegisterResponse> => {
  const result: RegisterResponse = await depositInternal(registerRequest, 'pnp', true);
  return result;
};

const login = async (loginRequest: LoginRequest): Promise<LoginResponse> => {
  const result: RegisterResponse = await depositInternal(loginRequest, 'pnp', true, true);
  return result;
};

const api: PaymentProviderApi = { deposit, withdraw, identify, register, login };
module.exports = api;
