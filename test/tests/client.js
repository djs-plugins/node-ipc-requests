const { IpcClient, TimeoutError, AbortedError, DisconnectedError } = moduleUnderTest;

describe('IpcClient', function () {
  describe('constructor', function () {
    baseConstructorTests(IpcClient, true);
  });

  describe('basics', function () {
    let client;
    this.beforeEach(function () {
      client = null;
    });
    this.afterEach(function () {
      if (client) {
        client.stop();
      }
    });
    it('start', function () {
      client = new IpcClient('testid');
      return client.awaitStart(10).should.be.rejectedWith(TimeoutError);
    });
    it('start (abort)', function () {
      client = new IpcClient('testid');
      const promise = client.awaitStart();
      client.stop();
      return promise.should.be.rejectedWith(AbortedError);
    });
    it('start - ipc-error without server', function () {
      client = new IpcClient('testid');
      const promise = new Promise(resolve => {
        client.once('ipc-error', resolve);
      });
      client.start();
      return promise.should.be.fulfilled;
    });
    it('send - without connection', async function () {
      client = new IpcClient('testid');
      await client.start();
      return (() => client.send()).should.throw(DisconnectedError);
    });
  });
});
