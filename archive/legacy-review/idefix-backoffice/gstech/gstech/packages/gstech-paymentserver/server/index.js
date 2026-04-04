/* @flow */
const express = require('express');
const middleware = require('gstech-core/modules/express-middleware');
const prometheus = require('gstech-core/modules/prometheus');

const { routers } = require('./providers');

const app: express$Application<> = express();

app.get('/api/v1/status', middleware.healthCheck);

// The Prometheus middleware should be enabled before the routes we want to measure.
app.use(prometheus.middleware);

app.use('/api/v1/paymentiq', routers.Bambora);
app.use('/api/v1/zimpler', routers.Zimpler);
app.use('/api/v1/skrill', routers.Skrill);
app.use('/api/v1/siru', routers.SiruMobile);
app.use('/api/v1/neteller', routers.Neteller);
app.use('/api/v1/trustly', routers.Trustly);
app.use('/api/v1/euteller', routers.Euteller);
app.use('/api/v1/emp', routers.EMP2);
app.use('/api/v1/jeton', routers.Jeton)
app.use('/api/v1/muchbetter', routers.MuchBetter);
app.use('/api/v1/qpay', routers.QPay)
app.use('/api/v1/worldpay', routers.Worldpay);
app.use('/api/v1/veriff', routers.Veriff);
app.use('/api/v1/neosurf', routers.Neosurf);
app.use('/api/v1/luqapay', routers.Luqapay);
app.use('/api/v1/brite', routers.Brite);
app.use('/api/v1/isx', routers.ISX);
app.use('/api/integration', routers.Worldpay);

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
