const IpcRequestResponse = require('./requestResponse');
const { AbortedError, DisconnectedError } = require('./errors');
class IpcSingleClientServer extends IpcRequestResponse {
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

  start () {
    if (this.started) return Promise.resolve();
    if (this.startingPromise) return this.startingPromise.promise;
    const promise = new Promise((resolve, reject) => {
      this.startingPromise = {resolve, reject};
      this.setStartCb(() => {
        super.start();
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
    this.ipc.server.stop();
    super.stop();
  }

  handleDisconnect () {
    this.socket = null;
    super.handleDisconnect();
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
    super.handleConnect();
  }
}

module.exports = IpcSingleClientServer;
