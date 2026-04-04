/* @flow */
const expressServer = require('gstech-core/modules/express-server');
const prometheus = require('gstech-core/modules/prometheus');
const { isLocal } = require('gstech-core/modules/config')
const { brandServerBackend: brandServerBackendPorts } = require('gstech-core/modules/ports');
const crontab = require('./crontab');
const workers = require('./workers');
const consumer = require('../server/common/consumer');
const configuration = require('../server/common/configuration');
const { initNrp } = require('../server/common/websocket');

crontab.init();
workers.init();

const { worker: workerMetricsPort } = brandServerBackendPorts.metricsPorts[configuration.shortBrandId()];
if (!isLocal) expressServer.startServer(prometheus.app, 'Metrics API', workerMetricsPort);

if (!configuration.productionMode()) {
  initNrp();
  consumer.startConsumingRewardProgressEvent();
  consumer.startConsumingCreditRewardEvent();
}
