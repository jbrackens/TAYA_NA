/* @flow */
const config = require('../config');
const request = require('../request')('backend auth api', config.api.backend.url);

const doReq = (brandId: BrandId, method: HttpMethod, path: string, body: mixed): Promise<any> => {
  const token = config.api.backend.staticTokens[brandId];
  return request(method, `/api/${brandId}/v1/${path}`, body, { 'X-Token': token });
};

const getCountries = async (brandId: BrandId): Promise<GetCountriesResponse> =>
  doReq(brandId, 'GET', 'countries', {});

const registrationRequest = async (brandId: BrandId, data: RequestRegistrationRequest): Promise<RequestRegistrationResponse> =>
  doReq(brandId, 'POST', 'register/request', data);

const registrationComplete = async (brandId: BrandId, data: CompleteRegistrationRequest): Promise<CompleteRegistrationResponse> =>
  doReq(brandId, 'POST', 'register/complete', data);

const loginRequest = async (brandId: BrandId, data: RequestLoginRequest): Promise<RequestLoginResponse> =>
  doReq(brandId, 'POST', 'login/request', data);

const loginComplete = async (brandId: BrandId, data: CompleteLoginRequest): Promise<CompleteLoginResponse> =>
  doReq(brandId, 'POST', 'login/complete', data);

const passwordResetRequest = async (brandId: BrandId, data: RequestPasswordResetRequest): Promise<RequestPasswordResetResponse> =>
  doReq(brandId, 'POST', 'password/reset/request', data);

const passwordResetComplete = async (brandId: BrandId, data: CompletePasswordResetRequest): Promise<CompletePasswordResetResponse> =>
  doReq(brandId, 'POST', 'password/reset/complete', data);

module.exports = {
  getCountries,
  registrationRequest,
  registrationComplete,
  loginRequest,
  loginComplete,
  passwordResetRequest,
  passwordResetComplete,
};
