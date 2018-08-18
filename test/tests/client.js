const { Client, TimeoutError, AbortedError, DisconnectedError } = moduleUnderTest;

describe('Client', function () {
  describe('constructor', function () {
    baseConstructorTests(Client, true);
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
      client = new Client('testid');
      return client.start().should.be.fulfilled;
    });
    it('start - abort', function () {
      client = new Client('testid');
      const promise = client.start();
      client.stop();
      return promise.should.be.rejectedWith(AbortedError);
    });
    it('start - double', function () {
      client = new Client('testid');
      return Promise.all([client.start(), client.start()]).should.be.fulfilled;
    });
    it('start - await double', async function () {
      client = new Client('testid');
      await client.start();
      return client.start().should.be.fulfilled;
    });
    it('start - ipc-error without server', function () {
      client = new Client('testid');
      const promise = new Promise(resolve => {
        client.once('ipc-error', resolve);
      });
      client.start();
      return promise.should.be.fulfilled;
    });
    it('awaitConnection - no server', function () {
      client = new Client('testid');
      return client.awaitConnection(10).should.be.rejectedWith(TimeoutError);
    });
    it('awaitConnection - abort', function () {
      client = new Client('testid');
      const promise = client.awaitConnection(1500);
      client.stop();
      return promise.should.be.rejectedWith(AbortedError);
    });
    it('send - without connection', async function () {
      client = new Client('testid');
      await client.start();
      return (() => client.send()).should.throw(DisconnectedError);
    });
  });
});
