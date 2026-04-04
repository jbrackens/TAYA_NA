// @flow
const express = require('express');
const promClient = require('prom-client');
const gcStats = require('prometheus-gc-stats');

gcStats(promClient.register)();

// Reduced the amount of buckets used from the default ones to reduce metrics overhead.
// Ref: https://prometheus.io/docs/practices/histograms/
// Defaults: https://github.com/siimon/prom-client#default-metrics
const buckets = [0.2, 1, 5];
promClient.collectDefaultMetrics({
  gcDurationBuckets: buckets,
  eventLoopMonitoringPrecision: 50,
});

const requestDuration = new promClient.Histogram({
  name: 'http_request_duration_milliseconds',
  help: 'request duration histogram',
  labelNames: ['handler', 'method', 'statuscode'],
  buckets,
});

const middleware: express$Middleware<express$Request, express$Response> = (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
) => {
  const start = Date.now();
  res.once('finish', () => {
    const duration = Date.now() - start;
    requestDuration.labels(req.url, req.method, res.statusCode).observe(duration);
  });
  next();
};

const app: express$Application<> = express();

// Setup Prometheus client library.
app.get('/metrics', async (_: express$Request, res: express$Response) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

module.exports = { app, middleware, client: promClient };
