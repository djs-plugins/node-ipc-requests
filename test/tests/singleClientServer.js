const { SingleClientServer, AbortedError, DisconnectedError, TimeoutError } = moduleUnderTest;

describe('SingleClientServer', function () {
  describe('constructor', function () {
    baseConstructorTests(SingleClientServer);
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
      server = new SingleClientServer('testid');
      return server.start().should.be.fulfilled;
    });
    it('start (abort)', function () {
      server = new SingleClientServer('testid');
      server.start().should.be.rejectedWith(AbortedError);
      server.stop();
    });
    it('start (double)', function () {
      server = new SingleClientServer('testid');
      return Promise.all([server.start(), server.start()]).should.be.fulfilled;
    });
    it('start (await double)', async function () {
      server = new SingleClientServer('testid');
      await server.start();
      return server.start().should.be.fulfilled;
    });
    it('awaitConnection - no server', function () {
      server = new SingleClientServer('testid');
      return server.awaitConnection(10).should.be.rejectedWith(TimeoutError);
    });
    it('send - without connection', async function () {
      server = new SingleClientServer('testid');
      await server.start();
      return (() => server.send()).should.throw(DisconnectedError);
    });
  });
});
