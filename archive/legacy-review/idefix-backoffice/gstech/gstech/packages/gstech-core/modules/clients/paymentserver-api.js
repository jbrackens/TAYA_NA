/* @flow */
import type {
  RegisterResponse,
  RegisterRequest,
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
  IdentifyRequest,
  IdentifyResponse,
  LoginRequest,
  LoginResponse,
} from './paymentserver-api-types';

const config = require('../config');
const request = require('../request')('paymentserver-api api', config.api.paymentServer.private);

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> =>
  request('POST', '/deposit', depositRequest);

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> =>
  request('POST', '/withdraw', withdrawRequest);

const identify = async (identifyRequest: IdentifyRequest): Promise<IdentifyResponse> =>
  request('POST', '/identify', identifyRequest);

const register = async (registerRequest: RegisterRequest): Promise<RegisterResponse> =>
  request('POST', '/register', registerRequest);

const login = async (loginRequest: LoginRequest): Promise<LoginResponse> =>
  request('POST', '/login', loginRequest);

module.exports = {
  deposit,
  withdraw,
  identify,
  register,
  login,
};
