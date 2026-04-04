/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  IdentifyRequest,
  IdentifyResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const logger = require('gstech-core/modules/logger');
const Brite = require('./Brite');
const briteClient = require('./brite-client');

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  try {
    logger.debug('Brite deposit request', depositRequest);
    const { urls, player } = depositRequest;
    const { token } = await Brite.basicDeposit(depositRequest);
    const depositResponse: DepositResponse = {
      html: briteClient.create(player.brandId, token, urls),
      requiresFullscreen: false,
    };
    return depositResponse;
  } catch (e) {
    logger.error('Brite deposit error:', e);
    const depositResponse: DepositResponse = {
      url: depositRequest.urls.failure,
      requiresFullscreen: false,
    };
    return depositResponse;
  }
};

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    logger.info('>>> Brite withdraw', { withdrawRequest });
    const { id } = await Brite.apiWithdraw(withdrawRequest);
    const withdrawResponse: WithdrawResponse = {
      ok: true,
      message: `Brite withdrawal initiated`,
      reject: false,
      id,
      complete: false,
    };
    logger.debug('<<< Brite withdraw', { withdrawResponse })
    return withdrawResponse;
  } catch (e) {
    logger.error('XXX Brite withdraw', { e });
    const withdrawResponse: WithdrawResponse = {
      ok: false,
      message: e.message,
      reject: true,
      complete: false,
    };
    return withdrawResponse;
  }
};

const register = async (registerRequest: RegisterRequest): Promise<RegisterResponse> => {
  try {
    logger.debug('Brite register request', registerRequest);
    const { urls, player } = registerRequest;
    const { token } = await Brite.kycDeposit(registerRequest);
    const registerResponse: RegisterResponse = {
      html: briteClient.create(player.brandId, token, urls, 'pnp'),
      requiresFullscreen: false,
      parameters: {
        sessionToken: token
      }
    };
    logger.debug('Brite register response', registerResponse);
    return registerResponse;
  } catch (e) {
    logger.error('Brite register error:', e);
    const registerResponse: RegisterResponse = {
      url: registerRequest.urls.failure,
      requiresFullscreen: false,
    };
    return registerResponse;
  }
};

const login = async (loginRequest: LoginRequest): Promise<LoginResponse> => {
  try {
    logger.debug('Brite login request', loginRequest);
    const { urls, player } = loginRequest;
    const { token } = await Brite.authSessionForLogin(loginRequest);
    const loginResponse: LoginResponse = {
      html: briteClient.create(player.brandId, token, urls, 'pnp'),
      requiresFullscreen: false,
    };
    logger.debug('Brite login response', loginResponse);
    return loginResponse;
  } catch (e) {
    logger.error('Brite login error:', e);
    const loginResponse: LoginResponse = {
      url: loginRequest.urls.failure,
      requiresFullscreen: false,
    };
    return loginResponse;
  }
};

const identify = async (identifyRequest: IdentifyRequest): Promise<IdentifyResponse> => {
  try {
    logger.debug('Brite identify request', identifyRequest);
    const { urls, player } = identifyRequest;
    const { token } = await Brite.authSessionForIdentify(identifyRequest);
    const identifyResponse: IdentifyResponse = {
      html: briteClient.create(player.brandId, token, urls, 'identify'),
      requiresFullscreen: false,
    };
    logger.debug('Brite identify response', identifyResponse);
    return identifyResponse;
  } catch (e) {
    logger.error('Brite identify error:', e);
    const identifyResponse: IdentifyResponse = {
      url: identifyRequest.urls.failure,
      requiresFullscreen: false,
    };
    return identifyResponse;
  }

}

const api: PaymentProviderApi = { deposit, withdraw, register, login, identify };
module.exports = api;
