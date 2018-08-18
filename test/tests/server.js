const { Server, AbortedError } = moduleUnderTest;

describe('Server', function () {
  describe('constructor', function () {
    baseConstructorTests(Server);
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
      server = new Server('testid');
      return server.start().should.be.fulfilled;
    });
    it('start (abort)', function () {
      server = new Server('testid');
      const res = server.start().should.be.rejectedWith(AbortedError);
      server.stop();
      return res;
    });
    it('start (double)', function () {
      server = new Server('testid');
      return Promise.all([server.start(), server.start()]).should.be.fulfilled;
    });
    it('start (await double)', async function () {
      server = new Server('testid');
      await server.start();
      return server.start().should.be.fulfilled;
    });
  });
});
