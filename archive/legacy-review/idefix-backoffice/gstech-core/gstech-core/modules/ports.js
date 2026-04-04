/* @flow */
const port = Number(process.env.PORT);
const walletPort = Number(process.env.WALLET_PORT);
const apiPort = Number(process.env.API_PORT);
const campaignServerPrivatePort = Number(process.env.CAMAPIGN_SERVER_PRIVATE_PORT);

const ports = {
  backend: {
    port: port || 3001,
    walletPort: walletPort || 3005,
  },
  walletServer: {
    port: port || 3003,
    apiPort: apiPort || 3004,
  },
  paymentServer: {
    port: port || 3006,
    apiPort: apiPort || 3007,
  },
  complianceServer: {
    port: port || 3009,
  },
  rewardServer: {
    port: port || 3012,
  },
  campaignServer: {
    publicPort: port || 3013,
    privatePort: campaignServerPrivatePort || 3014,
  },
  brandServerBackend: {
    port: port || 3000, // TODO: probably never used
    ports: {
      CJ: 3021,
      KK: 3022,
      LD: 3020,
      OS: 3023,
    },
  },
  lottoBackend: {
    port: port || 3020, // TODO: port already used
    apiPort: apiPort || 3040,
  },
  affmoreBackend: {
    port: port || 3033,
    apiPort: apiPort || 3034,
  },
};

module.exports = ports;
