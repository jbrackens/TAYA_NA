/* eslint-disable */
require('flow-remove-types/register');
require('axios-debug-log')
const request = require('supertest');
const chai = require('chai');
const dirtyChai = require('dirty-chai');
const chaiSubset = require('chai-subset');
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const { cleanUpPhotos, cleanUpPlayers, cleanUpTasks, setupPlayers, setupTasks, setFixedConversionRates } = require('./utils/db');
const chaiAsPromised = require('chai-as-promised');
const chaiDatetime = require('chai-datetime');

chai.use(chaiAsPromised);
chai.use(dirtyChai);
chai.use(chaiSubset);
chai.use(deepEqualInAnyOrder);
chai.use(chaiDatetime);

const login = async (app, email, password, ipAddress = '94.222.17.20') => {
  const { body: { token } } = await request(app)
    .post('/api/LD/v1/login')
    .send({ email, password, ipAddress, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36' })
    .expect(200);
  return { Authorization: `Token ${token}` };
};

global.expect = chai.expect;
global.setup = {
  players: setupPlayers,
  tasks: setupTasks,
  login,
  setFixedConversionRates,
};
global.clean = {
  photos: cleanUpPhotos,
  players: cleanUpPlayers,
  tasks: cleanUpTasks,
};
