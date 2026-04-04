/* @flow */
import type { Player } from 'gstech-core/modules/types/player';

const errorCodes = require('gstech-core/modules/errors/error-codes');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');
const joi = require('gstech-core/modules/joi');
const logger = require('gstech-core/modules/logger');
const { getPendingDeposits } = require('./deposits/Deposit');
const { getAccountWithParameters } = require('../accounts');

export type PaymentInfo = {
  originalAmount: Money,
  playerId: Id,
  accountId: Id,
  id: Id,
};

export type PaymentProviderDef = {
  account: any,
  parameters?: any,
  player?: any,
};

const paymentProviders: { [key: string]: PaymentProviderDef } = {
  EMP: {
    account: joi.object({
      parameters: {
        paymentIqAccountId: joi.string().trim().guid().required(),
        provider: 'EMP-disabled',
      },
    }),
  },
  Trustly: {
    player: joi.object({
      currencyId: joi
        .string()
        .trim()
        .regex(/^EUR|SEK$/)
        .required(),
    }),
    account: joi.alternatives().try(
      joi.object({
        parameters: {
          trustlyAccountId: joi.string().trim().required(),
        },
      }),
      joi.object({
        account: joi.string().trim().trustlyIban().required(),
      }),
    ),
  },
  Bambora: {
    account: joi.object({
      parameters: {
        paymentIqAccountId: joi.string().trim().guid().required(),
      },
    }),
  },
  AstroPayCard: {
    account: joi.object({
      parameters: {
        paymentIqAccountId: joi.string().trim().guid().required(),
      },
    }),
  },
  Pay4Fun: {
    account: joi.object({
      parameters: {
        paymentIqAccountId: joi.string().trim().guid().required(),
      },
    }),
  },
  Directa24: {
    player: joi.alternatives().try(
      joi.object({
        currencyId: 'BRL',
        countryId: 'BR',
      }),
      joi.object({
        currencyId: 'PEN',
        countryId: 'PE',
      }),
      joi.object({
        currencyId: 'CLP',
        countryId: 'CL',
      }),
    ),
    account: joi.object({}),
  },
  Interac: {
    player: joi.object({
      currencyId: joi.string().valid('CAD', 'EUR').required(),
      countryId: 'CA',
    }),
    account: joi.object({}),
  },
  Euteller: {
    account: joi.alternatives().try(
      joi.object({
        account: joi
          .string()
          .trim()
          .iban()
          .regex(/^FI(.*)$/)
          .required(),
      }),
      joi.object({
        account: joi
          .string()
          .trim()
          .regex(/^FI(.*)$/)
          .required(),
        parameters: {
          iban_hashed: joi
            .string()
            .trim()
            .regex(/^EUT(.+)$/)
            .required(),
        },
      }),
      joi.object({
        account: joi
          .string()
          .trim()
          .regex(/^\+358([0-9]{6,10})$/)
          .required(),
      }),
    ),
  },
  Entercash: {
    account: joi.alternatives().try(
      joi.object({
        account: joi.string().trim().iban().required(),
        parameters: {
          bic: joi.string().trim().bic().required(),
        },
      }),
      joi.object({
        account: joi.string().trim().bankAccount().required(),
      }),
    ),
  },
  BOV: {
    account: joi.alternatives().try(
      joi.object({
        account: joi.string().trim().iban().required(),
        parameters: {
          bic: joi.string().trim().bic().required(),
        },
      }),
      joi.object({
        account: joi.string().trim().bankAccount().required(),
      }),
    ),
  },
  Mifinity: {
    account: joi.alternatives().try(
      joi.object({
        parameters: {
          paymentIqAccountId: joi.string().trim().guid().required(),
          provider: 'EMP',
        },
      }),
      joi.object({
        account: joi.string().trim().iban().required(),
        parameters: {
          bic: joi.string().trim().bic().required(),
        },
      }),
    ),
  },
  Neteller: {
    account: joi.object({
      account: joi.string().trim().email().required(),
    }),
  },
  Skrill: {
    account: joi.alternatives().try(
      joi.object({
        account: joi.string().trim().email().required(),
      }),
      joi.object({
        parameters: joi
          .object({
            mb_transaction_id: joi.string().trim().required(),
          })
          .required(),
      }),
    ),
  },
  Worldpay: {
    player: joi.object({
      currencyId: 'USD',
    }),
    account: joi.object({
      parameters: {
        token: joi.string().trim().required(),
      },
    }),
  },
  Zimpler: {
    account: joi.object({
      parameters: {
        zimplerId: joi.string().trim().required(),
      },
    }),
  },
  MuchBetter: {
    account: joi.object({
      account: joi.string().trim().required(),
    }),
  },
  Jeton: {
    account: joi.object({
      account: joi.string().trim().required(),
    }),
  },
  Luqapay: {
    account: joi.object({
      account: joi.string().trim().required(),
      parameters: {
        swiftCode: joi.string().trim().required(),
      },
    }),
  },
  Brite: {
    account: joi.object({}),
    player: joi.object({}),
  },
  ISX: {
    account: joi.object({
      account: joi.string().trim().iban().required(),
    }),
  },
};

export type PaymentProvider = $Keys<typeof paymentProviders>;


const getPaymentProvider = async (id: Id): Promise<PaymentProvider> => {
  const { name } = await pg('payment_providers').first('name').where({ id });
  return name;
};

const validateWithdrawal = async (playerId: Id, paymentProviderId: Id, amount: Money, parameters: mixed, { originalAmount, accountId }: PaymentInfo): Promise<any> | Promise<boolean> => {
  if (originalAmount < amount) {
    return Promise.reject({ error: errorCodes.WITHDRAWAL_INVALID_AMOUNT });
  }
  const name = await getPaymentProvider(paymentProviderId);
  const provider = paymentProviders[name];
  if (!provider) {
    throw new Error('Invalid payment provider');
  }
  const [{ pendingDeposits }] = await getPendingDeposits(playerId).count('* as pendingDeposits');
  if (Number(pendingDeposits) > 0) {
    return Promise.reject({ error: { message: 'Unable to process withdrawal: player has pending deposits' } });
  }

  const account = await getAccountWithParameters(accountId);
  try {
    await validate(account, provider.account, 'Unable to process withdrawal: check payment account', { presence: 'required', allowUnknown: true });
  } catch (e) {
    logger.warn('Payment account validation failed', account, e);
    return Promise.reject({ error: { message: 'Unable to process withdrawal: check payment account' } });
  }

  if (provider.parameters) {
    try {
      await validate(parameters, provider.parameters, 'Unable to process withdrawal: invalid parameters', { presence: 'required', allowUnknown: true });
    } catch (e) {
      logger.warn('Payment parameter validation failed', parameters, e);
      return Promise.reject({ error: { message: 'Unable to process withdrawal: invalid parameters' } });
    }
  }
  // validate KYC status
  return true;
};

const validateProviderAccount = (
  player: Player,
  method: { provider: string, ...},
  account: { parameters: mixed, ... },
): boolean => {
  const providerSchema = paymentProviders[method.provider];
  if (!providerSchema) return true;

  const result = providerSchema.account.validate(account, {
    presence: 'required',
    allowUnknown: true,
  });
  if (result.error != null) {
    logger.error('Payment account validation failed', { account, err: result.error })
    return false;
  }
  if (providerSchema.player != null) {
    const r = providerSchema.player.validate(player, { presence: 'required', allowUnknown: true });
    if (r.error != null) {
      return false;
    }
  }
  return true;
};

module.exports = { validateWithdrawal, validateProviderAccount };
