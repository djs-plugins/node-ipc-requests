const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
global.should = chai.should();
global.baseConstructorTests = require('./constructorTests');
global.moduleUnderTest = require('../src');

/*
  TESTS BELOW
*/

require('./router');
require('./server');
