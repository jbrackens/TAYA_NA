const publicRuntimeConfig = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080',
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:18081',
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:18080/ws',
  API_GLOBAL_ENDPOINT: process.env.API_GLOBAL_ENDPOINT,
  WS_GLOBAL_ENDPOINT: process.env.WS_GLOBAL_ENDPOINT,
  SHOW_FOR_SUBMISSION: process.env.SHOW_FOR_SUBMISSION,
  CDN_URL: process.env.CDN_URL,
  env: process.env.ENV_NAME,
  staticFolder: '/static',
  eligibleRoles: ['admin', 'trader', 'operator'],
};

function getConfig() {
  return {
    publicRuntimeConfig,
    serverRuntimeConfig: {},
  };
}

module.exports = {
  __esModule: true,
  default: getConfig,
};
