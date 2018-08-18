const RequestResponse = require('./requestResponse');
const { AbortedError, DisconnectedError, TimeoutError } = require('./errors');
class SingleClientServer extends RequestResponse {
  constructor (id, options, router) {
    options = (options || {});
    options.maxConnections = 1;
    super(id, options, router);
    const { socketRoot, appspace } = this.ipc.config;
    const servePath = socketRoot + appspace + id;
    this.ipc.serve(servePath);
    this.ipc.server.on('request', (data, socket) => {
      if (socket !== this.socket) {
        this.emit('warn', 'Got request from wrong client. Dropping request');
        return;
      }
      this.handleRequest(data);
    });
    this.ipc.server.on('response', (data, socket) => {
      if (socket !== this.socket) {
        this.emit('warn', 'Got response from wrong client. Dropping request');
        return;
      }
      this.handleResponse(data);
    });
    this.ipc.server.on('connect', (...args) => { this.handleConnect(...args); });
    this.socket = null;
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

  send (event, data) {
    if (!this.connected) throw new DisconnectedError('Attempting to send when client is disconnected');
    this.ipc.server.emit(this.socket, event, data);
  }

  start (timeout = null) {
    if (this.started) return Promise.resolve();
    if (!this.startingPromise) {
      const promise = new Promise((resolve, reject) => {
        this.startingPromise = {resolve, reject};
        this.setStartCb(() => {
          super.start();
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
      return Promise.resolve();
    }
    if (!this.started) return Promise.resolve();
    if (this.socket) this.socket.destroy();
    this.ipc.server.stop();
    return super.stop();
  }

  handleDisconnect () {
    this.socket = null;
    super.handleDisconnect(true);
  }

  handleConnect (socket) {
    if (this.socket) {
      socket.destroy();
      this.emit('warn', 'Second client tried to connect to single client server. Closing connection.');
      return;
    }
    this.socket = socket;
    socket.once('close', () => {
      this.handleDisconnect();
    });
    super.handleConnect(true);
  }
}

module.exports = SingleClientServer;
