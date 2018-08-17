const { IpcServer, IpcRouter, AbortedError } = moduleUnderTest;

describe('IpcServer', function () {
  describe('constructor', function () {
    baseConstructorTests(IpcServer);
    it('router - undefined', function () {
      const server = new IpcServer('testid');
      return should.not.exist(server.router);
    });
    it('router - provided', function () {
      const router = new IpcRouter();
      const server = new IpcServer('testid', undefined, router);
      return server.router.should.be.equal(router);
    });
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
      server = new IpcServer('testid');
      return server.start().should.be.fulfilled;
    });
    it('start (abort)', function () {
      server = new IpcServer('testid');
      const res = server.start().should.be.rejectedWith(AbortedError);
      server.stop();
      return res;
    });
    it('start (double)', function () {
      server = new IpcServer('testid');
      return Promise.all([server.start(), server.start()]).should.be.fulfilled;
    });
    it('start (await double)', async function () {
      server = new IpcServer('testid');
      await server.start();
      return server.start().should.be.fulfilled;
    });
  });
});
