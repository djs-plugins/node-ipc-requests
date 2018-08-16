const { IpcServer, IpcRouter } = moduleUnderTest;

describe('server', function () {
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
});
