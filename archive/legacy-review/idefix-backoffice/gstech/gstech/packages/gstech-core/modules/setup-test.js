/* eslint-disable */
require('flow-remove-types/register');
require('axios-debug-log')
const chai = require('chai');  
const dirtyChai = require('dirty-chai');  
const chaiSubset = require('chai-subset');  
const chaiXml = require('chai-xml');  
const chaiAsPromised = require('chai-as-promised');  
const chaiDatetime = require('chai-datetime');  

chai.use(chaiAsPromised);
chai.use(chaiXml);
chai.use(dirtyChai);
chai.use(chaiSubset);
chai.use(chaiDatetime);

global.expect = chai.expect;
