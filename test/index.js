const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
global.should = chai.should();

global.moduleUnderTest = require('../src');

const utils = require('./utils');
global.baseConstructorTests = utils.baseConstructorTests;

require('./tests');
