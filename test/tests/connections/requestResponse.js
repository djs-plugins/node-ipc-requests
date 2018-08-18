const { SingleClientServer, Server, Client, RequestError, MissingRouteError, Router } = moduleUnderTest;

describe('request response', function () {
  require('./cleanup').apply(this);
  it('send request to nonexistent route on Server', async function () {
    this.server = new Server('rr1');
    await this.server.start();
    this.client = new Client('rr1');
    await this.client.awaitConnection(1500);
    return this.client.request('testroute')
      .should.be.rejectedWith(RequestError)
      .that.eventually.has.property('code', MissingRouteError.prototype.code);
  });
  it('send request to nonexistent route on SingleClientServer', async function () {
    this.server = new SingleClientServer('rr2');
    await this.server.start(1500);
    this.client = new Client('rr2');
    await this.client.awaitConnection(1500);
    return this.client.request('testroute')
      .should.be.rejectedWith(RequestError)
      .that.eventually.has.property('code', MissingRouteError.prototype.code);
  });
  it('send request to nonexistent route on Client', async function () {
    this.client = new Client('rr3');
    await this.client.start(1500);
    this.server = new SingleClientServer('rr3', { timeout: 1000 });
    await this.server.awaitConnection(1500);
    return this.server.request('testroute')
      .should.be.rejectedWith(RequestError)
      .that.eventually.has.property('code', MissingRouteError.prototype.code);
  });
  it('send request to existing route on Server', async function () {
    this.server = new Server('rr4');
    this.server.router.addRoute('testroute', () => 'testresponse');
    await this.server.start();
    this.client = new Client('rr4');
    await this.client.awaitConnection(1500);
    return this.client.request('testroute')
      .should.eventually.be.equal('testresponse');
  });
  it('send request to existing route on SingleClientServer', async function () {
    const router = new Router();
    router.addRoute('testroute', () => 'testresponse');
    this.server = new Server('rr5', null, router);
    await this.server.start();
    this.client = new Client('rr5');
    await this.client.awaitConnection(1500);
    return this.client.request('testroute')
      .should.eventually.be.equal('testresponse');
  });
});
