require('flow-remove-types/register');
const chai = require('chai'); // eslint-disable-line
const dirtyChai = require('dirty-chai'); // eslint-disable-line
const chaiSubset = require('chai-subset'); // eslint-disable-line
const chaiXml = require('chai-xml'); // eslint-disable-line
const chaiAsPromised = require('chai-as-promised'); // eslint-disable-line

chai.use(chaiXml);
chai.use(dirtyChai);
chai.use(chaiSubset);
chai.use(chaiAsPromised);

global.expect = chai.expect;
