const { IpcServer, IpcClient, RequestError } = moduleUnderTest;

describe('connections', function () {
  let server;
  let client;
  let clients;
  this.beforeEach(function () {
    server = null;
    client = null;
    clients = [];
  });
  this.afterEach(function () {
    if (server) {
      try {
        server.stop();
      } catch (err) {}
    }
    if (client && !clients.includes(client)) {
      clients.push(client);
    }
    for (const client of clients) {
      for (const id in client.ipc.of) {
        client.ipc.disconnect(id);
      }
    }
  });
  describe('basics', function () {
    it('bare minimum - server', async function () {
      server = new IpcServer('testid');
      await server.start(1500);
      client = new IpcClient('testid');
      await client.start(1500);
      return client.request('testroute').should.eventually.be.rejectedWith(RequestError);
    });
  });
});
