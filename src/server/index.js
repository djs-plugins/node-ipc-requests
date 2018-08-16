const IpcBase = require('../base');
const IpcServerClient = require('./client');
const { MissingClientError } = require('../errors');

class IpcServer extends IpcBase {
  constructor (id, options, router) {
    super(id, options);
    this.router = router;
    const { socketRoot, appspace } = this.ipc.config;
    const servePath = socketRoot + appspace + id;
    this.connections = new Map();
    this.ipc.serve(servePath, () => this.emit('started'));
    this.ipc.server.on('request', (...args) => { this.handleRequest(...args); this.emit('request', ...args); });
    this.ipc.server.on('response', (...args) => { this.handleResponse(...args); this.emit('response', ...args); });
    this.ipc.server.on('connect', (...args) => { this.handleConnect(...args); });
  }

  start () {
    this.ipc.server.start();
  }

  stop () {
    this.ipc.server.stop();
  }

  async handleRequest (req, socket) {
    const client = this.connections.get(socket);
    if (!client) {
      this.emit('error', new MissingClientError('Got request from unknown client'));
    }
    return client.handleRequest(req);
  }

  async handleResponse (resp, socket) {
    const client = this.connections.get(socket);
    if (!client) {
      return this.emit('error', new MissingClientError('Got response from unknown client'));
    }
    return client.handleResponse(resp);
  }

  async handleConnect (socket) {
    const client = new IpcServerClient(this.ipc, socket, this.options, this.router);
    this.connections.set(socket, client);
    this.emit('newClient', client);
    client.once('disconnect', () => {
      this.connections.delete(socket);
      this.emit('disconnect', client);
    });
  }

  async broadcast (resource, data, clients) {
    if (clients) {
      if (Array.isArray(clients)) return Promise.all(clients.map(client => this.request(resource, data, client)));
      if (!(clients instanceof IpcServerClient)) clients = this.clients.get(clients);
      if (!clients) throw new MissingClientError('Tried to broadcast to missing client');
      return clients.request(resource, data);
    } else {
      return this.request(resource, data, this.ipc.server.sockets);
    }
  }
}

module.exports = IpcServer;
