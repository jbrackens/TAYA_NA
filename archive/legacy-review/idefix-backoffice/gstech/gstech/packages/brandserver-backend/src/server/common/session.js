/* @flow */
const session = require('express-session');
const RedisStore = require('connect-redis').default;

const configuration = require('./configuration');

const cookieSecret = '123ljn123njk213hkjnjkn123njk132jkb312jhbk1312312312jnn123jk12njk32';
const redis = require('./redis');

const sessionConfig = {
  secret: 'lpsadpladspe32fwfsddfs',
  key: configuration.productionMode() ? 'ld.sid' : `${configuration.project()}.sid`,
  proxy: true,
  rolling: true,
  saveUninitialized: false,
  resave: true,
  cookie: {
    path: '/',
    secure: process.env.NODE_ENV === 'production' && process.env.LOCAL_PRODUCTION !== 'true',
    secret: cookieSecret,
    httpOnly: true,
    maxAge: null,
  },
  store: new RedisStore({
    client: redis.newClient(),
    prefix: `{${configuration.project() - session}}`,
    no_ready_check: true,
  }),
};

module.exports = { cookieSecret, session: (session(sessionConfig): any) };
