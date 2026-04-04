/* @flow */
import type {
  DepositRequest,
  WithdrawRequest,
  RegisterRequest,
  IdentifyRequest,
  LoginRequest,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProvider } from 'gstech-core/modules/constants';
import type { PaymentProviderApi } from './types';

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const schemas = require('./schemas');

const depositHandler = (paymentMethods: { [PaymentProvider]: PaymentProviderApi }): ((req: express$Request, res: express$Response) => Promise<express$Response>) => async (req: express$Request, res: express$Response) => {
  try {
    const depositRequest: DepositRequest = await validate(req.body, schemas.depositSchema, 'Deposit request validation failed');
    const { deposit } = depositRequest;
    const provider = paymentMethods[deposit.paymentProvider];
    if (provider != null && provider.deposit) {
      const depositResponse = await provider.deposit(depositRequest);
      return res.json(depositResponse);
    }
    return res.status(400).json({ error: { message: `Payment provider '${deposit.paymentProvider}' is not defined` } });
  } catch (e) {
    logger.error('Deposit request failed:', e);
    return res.status(500).json({ error: { message: e.message } });
  }
};

const withdrawHandler = (paymentMethods: { [PaymentProvider]: PaymentProviderApi }): ((req: express$Request, res: express$Response) => Promise<express$Response>) => async (req: express$Request, res: express$Response) => {
  try {
    const withdrawRequest: WithdrawRequest = await validate(req.body, schemas.withdrawSchema, 'Withdraw request validation failed');
    const { withdrawal } = withdrawRequest;
    if (withdrawal.paymentProvider != null) {
      const provider = paymentMethods[withdrawal.paymentProvider];
      if (provider != null && provider.withdraw) {
        const withdrawResponse = await provider.withdraw(withdrawRequest);
        return res.json(withdrawResponse);
      }
    }
    return res.status(400).json({ error: { message: `Payment provider '${withdrawal.paymentProvider || ''}' is not defined` } });
  } catch (e) {
    logger.error('Withdraw request failed:', e);
    return res.status(500).json({ error: { message: e.message } });
  }
};

const identifyHandler = (paymentMethods: { [PaymentProvider]: PaymentProviderApi }): ((req: express$Request, res: express$Response) => Promise<express$Response>) => async (req: express$Request, res: express$Response) => {
  try {
    const identifyRequest: IdentifyRequest = await validate(req.body, schemas.identifySchema, 'Identify request validation failed');
    const { identify } = identifyRequest;
    const provider = paymentMethods[identify.paymentProvider];
    if (provider != null && provider.identify) {
      const identifyResponse = await provider.identify(identifyRequest);
      return res.json(identifyResponse);
    }
    return res.status(400).json({ error: { message: `Payment provider '${identify.paymentProvider}' is not defined` } });
  } catch (e) {
    logger.error('Identify request failed:', e);
    return res.status(500).json({ error: { message: e.message } });
  }
};

const registerHandler = (paymentMethods: { [PaymentProvider]: PaymentProviderApi }): ((req: express$Request, res: express$Response) => Promise<express$Response>) => async (req: express$Request, res: express$Response) => {
  try {
    const registerRequest: RegisterRequest = await validate(req.body, schemas.registerSchema, 'Register request validation failed');
    const { deposit } = registerRequest;
    const provider = paymentMethods[deposit.paymentMethod];
    if (provider != null && provider.register) {
      const registerResponse = await provider.register(registerRequest);
      return res.json(registerResponse);
    }
    return res.status(400).json({ error: { message: `Payment provider '${deposit.paymentMethod}' is not defined` } });
  } catch (e) {
    logger.error('Register request failed:', e);
    return res.status(500).json({ error: { message: e.message } });
  }
};

const loginHandler = (paymentMethods: { [PaymentProvider]: PaymentProviderApi }): ((req: express$Request, res: express$Response) => Promise<express$Response>) => async (req: express$Request, res: express$Response) => {
  try {
    const registerRequest: LoginRequest = await validate(req.body, schemas.loginSchema, 'Login request validation failed');
    const { deposit } = registerRequest;
    const provider = paymentMethods[deposit.paymentMethod];
    if (provider != null && provider.login) {

      const registerResponse = await provider.login(registerRequest);
      return res.json(registerResponse);
    }

    return res.status(400).json({ error: { message: `Payment provider '${deposit.paymentMethod}' is not defined` } });
  } catch (e) {

    logger.error('Login request failed:', e);
    return res.status(500).json({ error: { message: e.message } });
  }
};

module.exports = {
  depositHandler,
  withdrawHandler,
  identifyHandler,
  registerHandler,
  loginHandler,
};
