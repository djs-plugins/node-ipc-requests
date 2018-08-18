const { SingleClientServer, Server, Client } = moduleUnderTest;

describe('basics', function () {
  require('./cleanup').apply(this);
  it('await connection from Client to Server', async function () {
    this.server = new Server('testid');
    await this.server.start();
    this.client = new Client('testid');
    return this.client.awaitConnection(1500).should.be.fulfilled;
  });
  it('await connection Client to SingleClientServer', async function () {
    this.server = new SingleClientServer('testid');
    await this.server.start(1500);
    this.client = new Client('testid');
    return this.client.awaitConnection(1500).should.be.fulfilled;
  });
  it('await connection from SingleClientServer to Client', async function () {
    this.client = new Client('testid');
    await this.client.start(1500);
    this.server = new SingleClientServer('testid', { timeout: 1000 });
    return this.server.awaitConnection(1500).should.be.fulfilled;
  });
  it('server should get client on connect', async function () {
    this.server = new Server('testid');
    await this.server.start();
    this.client = new Client('testid');
    const newClientPromise = new Promise(resolve => {
      this.server.once('newClient', resolve);
    });
    await this.client.awaitConnection(1500);
    await newClientPromise;
    return this.server.clients.size.should.be.equal(1);
  });
  it('server should remove client on disconnect', async function () {
    this.server = new Server('testid');
    await this.server.start();
    this.client = new Client('testid');
    const disconnectedClientPromise = new Promise(resolve => {
      this.server.once('disconnectedClient', resolve);
    });
    await this.client.awaitConnection(1500);
    this.client.stop();
    await disconnectedClientPromise;
    return this.server.clients.size.should.be.equal(0);
  });
});
