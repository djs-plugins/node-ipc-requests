const IpcBase = require('./base');
const ServerClient = require('./serverClient');
const Router = require('./router');
const { MissingClientError, AbortedError, TimeoutError } = require('./errors');

class Server extends IpcBase {
  constructor (id, options, router) {
    super(id, options);
    this.router = router || new Router();
    const { socketRoot, appspace } = this.ipc.config;
    const servePath = socketRoot + appspace + id;
    this.clients = new Map();
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

  start (timeout = null) {
    if (this.started) return Promise.resolve();
    if (!this.startingPromise) {
      const promise = new Promise((resolve, reject) => {
        this.startingPromise = {resolve, reject};
        this.setStartCb(() => {
          this.started = true;
          this.emit('start');
          this.startingPromise.resolve();
        });
        this.ipc.server.start();
      }).finally(() => {
        this.startingPromise = null;
      });
      this.startingPromise.promise = promise;
    }
    if (timeout) {
      const timeoutErr = new TimeoutError('Failed to start within the specified timeframe.');
      Error.captureStackTrace(timeoutErr, this.start);

      return Promise.race([
        this.startingPromise.promise,
        new Promise((resolve, reject) => setTimeout(() => { reject(timeoutErr); this.stop(); }, timeout))
      ]);
    }
    return this.startingPromise.promise;
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
    for (const [, client] of this.clients) {
      client.stop();
    }
    this.ipc.server.stop();
    this.emit('stop');
  }

  handleRequest (req, socket) {
    const client = this.clients.get(socket);
    if (!client) {
      this.emit('error', new MissingClientError('Got request from unknown client'));
      return;
    }
    this.emit('request', client, req);
    client.handleRequest(req);
  }

  handleResponse (resp, socket) {
    const client = this.clients.get(socket);
    if (!client) {
      this.emit('error', new MissingClientError('Got response from unknown client'));
      return;
    }
    this.emit('response', client, resp);
    client.handleResponse(resp);
  }

  handleConnect (socket) {
    const client = new ServerClient(this.ipc, socket, this.options);
    if (this.router) client.router.parent = this.router;
    this.clients.set(socket, client);
    this.emit('newClient', client);
    client.once('stop', () => {
      this.clients.delete(socket);
      this.emit('disconnectedClient', client);
    });
  }

  broadcast (resource, data, clients) {
    if (clients) {
      if (Array.isArray(clients)) return Promise.resolve(clients.map(client => this.broadcast(resource, data, client)));
      if (!(clients instanceof ServerClient)) clients = this.clients.get(clients);
      if (!clients) return Promise.reject(new MissingClientError('Tried to broadcast to missing client'));
      return clients.request(resource, data);
    } else {
      return this.request(resource, data, [...this.clients.values()]);
    }
  }
}

module.exports = Server;
