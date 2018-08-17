const IpcBase = require('./base');
const IpcServerClient = require('./serverClient');
const { MissingClientError, AbortedError } = require('./errors');

class IpcServer extends IpcBase {
  constructor (id, options, router) {
    super(id, options);
    this.router = router;
    const { socketRoot, appspace } = this.ipc.config;
    const servePath = socketRoot + appspace + id;
    this.connections = new Map();
    this.ipc.serve(servePath, () => this.emit('start'));
    this.ipc.server.on('request', (...args) => this.handleRequest(...args));
    this.ipc.server.on('response', (...args) => this.handleResponse(...args));
    this.ipc.server.on('connect', (...args) => this.handleConnect(...args));
    this.started = false;
    this.startingPromise = null;
    this._startCb = null;
  }

  setStartCb (func) {
    if (this._startCb) this.ipc.server.off('start', this._startCb);
    this._startCb = () => {
      this.ipc.server.off('start', this._startCb);
      this._startCb = null;
      func();
    };
    this.ipc.server.on('start', this._startCb);
  }

  start () {
    if (this.started) return Promise.resolve();
    if (this.startingPromise) return this.startingPromise.promise;
    const promise = new Promise((resolve, reject) => {
      this.startingPromise = {resolve, reject};
      this.setStartCb(() => {
        this.started = true;
        this.emit('start');
        this.startingPromise.resolve();
      });
      this.ipc.server.start();
    }).then(res => {
      this.startingPromise = null;
      return res;
    }, err => {
      this.startingPromise = null;
      throw err;
    });
    this.startingPromise.promise = promise;
    return promise;
  }

  stop () {
    if (this.startingPromise) {
      this.setStartCb(() => {
        this.ipc.server.stop();
      });
      this.startingPromise.reject(new AbortedError('Server got stopped before properly starting'));
      return;
    }
    if (!this.started) return;
    this.started = false;
    this.ipc.server.stop();
    this.emit('stop');
  }

  handleRequest (req, socket) {
    const client = this.connections.get(socket);
    if (!client) {
      this.emit('error', new MissingClientError('Got request from unknown client'));
      return;
    }
    this.emit('request', client, req);
    client.handleRequest(req);
  }

  handleResponse (resp, socket) {
    const client = this.connections.get(socket);
    if (!client) {
      this.emit('error', new MissingClientError('Got response from unknown client'));
      return;
    }
    this.emit('response', client, resp);
    client.handleResponse(resp);
  }

  handleConnect (socket) {
    const client = new IpcServerClient(this.ipc, socket, this.options);
    if (this.router) client.router.parent = this.router;
    this.connections.set(socket, client);
    this.emit('newClient', client);
    client.once('stop', () => {
      this.connections.delete(socket);
      this.emit('disconnectedClient', client);
    });
  }

  broadcast (clients, resource, data) {
    if (clients) {
      if (Array.isArray(clients)) return Promise.all(clients.map(client => this.request(resource, data, client)));
      if (!(clients instanceof IpcServerClient)) clients = this.clients.get(clients);
      if (!clients) return Promise.reject(new MissingClientError('Tried to broadcast to missing client'));
      return clients.request(resource, data);
    } else {
      return this.request(resource, data, this.ipc.server.sockets);
    }
  }
}

module.exports = IpcServer;
