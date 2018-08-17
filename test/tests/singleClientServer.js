const { IpcSingleClientServer, AbortedError, DisconnectedError } = moduleUnderTest;

describe('IpcSingleClientServer', function () {
  describe('constructor', function () {
    baseConstructorTests(IpcSingleClientServer, true);
  });

  describe('basics', function () {
    let server;
    this.beforeEach(function () {
      server = null;
    });
    this.afterEach(function () {
      if (server) {
        server.stop();
      }
    });
    it('start', function () {
      server = new IpcSingleClientServer('testid');
      return server.start().should.be.fulfilled;
    });
    it('start (abort)', function () {
      server = new IpcSingleClientServer('testid');
      server.start().should.be.rejectedWith(AbortedError);
      server.stop();
    });
    it('start (double)', function () {
      server = new IpcSingleClientServer('testid');
      return Promise.all([server.start(), server.start()]).should.be.fulfilled;
    });
    it('start (await double)', async function () {
      server = new IpcSingleClientServer('testid');
      await server.start();
      return server.start().should.be.fulfilled;
    });
    it('send - with no connection', async function () {
      server = new IpcSingleClientServer('testid');
      await server.start();
      return (() => server.send()).should.throw(DisconnectedError);
    });
  });
});
