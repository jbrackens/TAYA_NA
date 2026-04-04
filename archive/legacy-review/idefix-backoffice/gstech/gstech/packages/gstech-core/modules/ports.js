/* @flow */
const port: ?number = Number(process.env.PORT);
const walletPort: ?number = Number(process.env.WALLET_PORT);
const apiPort: ?number = Number(process.env.API_PORT);
const campaignServerPrivatePort: ?number = Number(process.env.CAMPAIGN_SERVER_PRIVATE_PORT);
const rewardServerManagementPort: ?number = Number(process.env.REWARD_SERVER_MANAGEMENT_PORT);
const metricsPort: ?number = Number(process.env.METRICS_PORT);

export type Ports = {
  backend: {
    port: number,
    walletPort: number,
    metricsPort: { app: number, worker: number },
  },
  walletServer: {
    port: number,
    apiPort: number,
    metricsPort: number,
  },
  paymentServer: {
    port: number,
    apiPort: number,
    metricsPort: number,
  },
  complianceServer: {
    port: number
  },
  rewardServer: {
    management: number,
    port: number,
    metricsPort: number,
  },
  campaignServer: {
    publicPort: number,
    privatePort: number,
    metricsPort: number,
  },
  brandServerBackend: {
    port: number,
    ports: {
      [key: BrandId]: number
    },
    metricsPorts: {
      [key: BrandId]: { app: number, worker: number },
    },
  },
  lottoBackend: {
    port: number,
    apiPort: number,
  },
  affmoreBackend: {
    port: number,
    apiPort: number,
    metricsPort: number,
  },
};

const ports: Ports = {
  backend: {
    port: port || 3001,
    walletPort: walletPort || 3005,
    metricsPort: { app: metricsPort || 4001, worker: metricsPort || 4060 },
  },
  walletServer: {
    port: port || 3003,
    apiPort: apiPort || 3004,
    metricsPort: metricsPort || 4003,
  },
  paymentServer: {
    port: port || 3006,
    apiPort: apiPort || 3007,
    metricsPort: metricsPort || 4006,
  },
  complianceServer: {
    port: port || 3009,
  },
  rewardServer: {
    port: port || 3012,
    management: rewardServerManagementPort || 3011,
    metricsPort: metricsPort || 4012,
  },
  campaignServer: {
    publicPort: port || 3013,
    privatePort: campaignServerPrivatePort || 3014,
    metricsPort: metricsPort || 4013,
  },
  brandServerBackend: {
    port: port || 3000, // TODO: probably never used
    ports: {
      CJ: 3021,
      KK: 3022,
      LD: 3020,
      OS: 3023,
      FK: 3024,
      SN: 3025,
      VB: 3026,
    },
    metricsPorts: {
      CJ: { app: metricsPort || 4021, worker: metricsPort || 4061 },
      KK: { app: metricsPort || 4022, worker: metricsPort || 4062 },
      LD: { app: metricsPort || 4020, worker: metricsPort || 4060 },
      OS: { app: metricsPort || 4023, worker: metricsPort || 4063 },
      FK: { app: metricsPort || 4024, worker: metricsPort || 4064 },
      SN: { app: metricsPort || 4025, worker: metricsPort || 4065 },
      VB: { app: metricsPort || 4026, worker: metricsPort || 4066 },
    },
  },
  lottoBackend: {
    port: port || 3020, // TODO: port already used
    apiPort: apiPort || 3040,
  },
  affmoreBackend: {
    port: port || 3033,
    apiPort: apiPort || 3034,
    metricsPort: metricsPort || 4033,
  },
};

module.exports = ports;
