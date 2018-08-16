const { IpcRouter } = require('../src');

/* eslint-env node, mocha */
module.exports = (constructor, router) => {
  it('empty', function () {
    return (() => new constructor()).should.throw(TypeError);
  });
  it('minimal', function () {
    return new constructor('testid').should.be.instanceOf(constructor);
  });
  it('ipc options', function () {
    const ipcOptions = {
      appspace: 'testAppSpace',
      maxRetries: 10
    };
    const server = new constructor('testid', ipcOptions);
    return server.ipc.config.should.be.an('object').that.includes(ipcOptions);
  });
  it('ipc options - no leak', function () {
    const options = {
      timeout: 5000,
      customOption: 'test'
    };
    const server = new constructor('testid', options);
    return server.ipc.config.should.be.an('object').that.does.not.includes(options);
  });
  it('options', function () {
    const options = {
      timeout: 5000,
      customOption: 'test'
    };
    const server = new constructor('testid', options);
    return server.options.should.be.an('object').that.includes(options);
  });
  it('options - no leak', function () {
    const ipcOptions = {
      appspace: 'testAppSpace',
      maxRetries: 10
    };
    const server = new constructor('testid', ipcOptions);
    return server.options.should.be.an('object').that.does.not.includes(ipcOptions);
  });
  if (!router) return;
  it('router - undefined', function () {
    const server = new constructor('testid');
    return server.router.should.be.instanceOf(IpcRouter);
  });
  it('router - provided', function () {
    const router = new IpcRouter();
    const server = new constructor('testid', undefined, router);
    return server.router.should.be.equal(router);
  });
};
