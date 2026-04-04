// @flow
import type { DepositRequest } from 'gstech-core/modules/clients/paymentserver-api-types';
import type { CashierConfigPmInfo, CashierConfigPmInfoFn, D24DirectService } from './types';

const logger = require('gstech-core/modules/logger');
const client = require('gstech-core/modules/clients/backend-payment-api');

const directa24: CashierConfigPmInfoFn = ({ deposit: { paymentMethod }, params, player }) => {
  const nationalId = (params?.nationalId || player.nationalId)?.replace(/\D/g, '') ?? '';
  const services: { [key: string]: D24DirectService } = {
    Pix: 'IX',
    Boleto: 'BL',
    Itau: 'I',
    PagoEfectivo: 'EF',
    BCP: 'BC',
    WebPay: 'WP',
    MercadoPago: 'ME',
    D24Visa: 'VI',
    D24MasterCard: 'MC',
    TuPay: 'XA',
  };
  const service = services[paymentMethod] ?? params.selectedBank;
  return {
    providerType: 'D24',
    autoProcess: true,
    user: { nationalId },
    attributes: { nationalId, service },
  };
};

const card: CashierConfigPmInfoFn = async ({ deposit, params, player }) => {
  const { paymentAccountId } = params;
  const { paymentProvider } = deposit;
  if (paymentAccountId) {
    const account = await client.getAccount(player.username, paymentAccountId);
    logger.debug(`PIQ Account ${player.username} - ${paymentAccountId}`, account);
    const existingCardBase = {
      accountId: account.parameters?.paymentIqAccountId,
      showAccounts: 'inline',
      storeAccount: true,
      attributes: {
        prefilledCard: true,
      },
    };
    if (paymentProvider === 'MobulaPay')
      return {
        ...existingCardBase,
        providerType: 'CREDITCARD-IKAJO',
        attributes: { ...existingCardBase.attributes, service: 'MobulaPay' },
      };
    return {
      ...existingCardBase,
      providerType: 'CREDITCARD',
      attributes: { ...existingCardBase.attributes, service: 'Bambora' },
    };
  }
  const newCardBase = {
    showAccounts: false,
    storeAccount: true,
    attributes: { cardHolder: `${player.firstName} ${player.lastName}` },
  };
  if (paymentProvider === 'MobulaPay')
    return {
      ...newCardBase,
      providerType: 'CREDITCARD-IKAJO',
      attributes: { ...newCardBase.attributes, service: 'MobulaPay' },
    };
  return {
    ...newCardBase,
    providerType: 'CREDITCARD',
    attributes: { ...newCardBase.attributes, service: 'Bambora' },
  };
};

module.exports = async (dp: DepositRequest): Promise<CashierConfigPmInfo> => {
  const { paymentProvider, paymentMethod } = dp.deposit;
  switch (paymentProvider) {
    case 'Interac':
      switch (paymentMethod) {
        case 'InteracOnline':
          return {
            providerType: 'INTERAC_ONLINE',
            autoProcess: true,
            attributes: { service: 'InteracOnline' },
          };
        case 'InteracETransfer':
          return {
            providerType: 'INTERAC_ETRANSFER',
            autoProcess: true,
            attributes: { service: 'InteracETransfer' },
          };
        default:
          throw new Error(`Unknown interac method for PIQ: ${paymentMethod}`);
      }
    case 'Kluwp':
      return {
        providerType: 'KLUWP',
        autoProcess: true,
        attributes: { service: 'Kluwp' },
      };
    case 'Directa24':
      return directa24(dp);
    case 'Bambora':
    case 'MobulaPay': // Will be for cards in Norway
      return await card(dp);
    case 'Flykk':
      return { providerType: 'FLYKK', autoProcess: true, attributes: { service: 'Flykk' } };
    case 'AstroPayCard':
      return {
        providerType: 'ASTROPAYCARD',
        autoProcess: true,
        attributes: { service: 'AstroPayCard' },
      };
    case 'Pay4Fun':
      return dp.account?.account
        ? {
            providerType: 'PAY4FUN',
            autoProcess: true,
            attributes: { service: 'Pay4Fun' },
            user: { email: dp.account.account },
          }
        : {
            providerType: 'PAY4FUN',
            attributes: { service: 'Pay4Fun' },
            user: { email: dp.player.email },
          };
    default:
      throw new Error(`Unknown provider for PIQ: ${paymentProvider}`);
  }
};
