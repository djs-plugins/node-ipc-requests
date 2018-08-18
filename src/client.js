const RequestResponse = require('./requestResponse');
const { DisconnectedError, AbortedError } = require('./errors');

class Client extends RequestResponse {
  constructor (...args) {
    super(...args);
    this.startingPromise = null;
    this._startCb = null;
  }

  setStartCb (func) {
    this._startCb = () => {
      this._startCb = null;
      func();
    };
  }

  get socket () {
    return this.ipc.of[this.id];
  }

  send (event, data) {
    if (!this.connected) throw new DisconnectedError('Attempting to send when client is disconnected');
    this.socket.emit(event, data);
  }

  start () {
    if (this.started) return Promise.resolve();
    if (this.startingPromise) return this.startingPromise.promise;
    const promise = new Promise((resolve, reject) => {
      this.startingPromise = {resolve, reject};
      this.setStartCb(() => {
        this.socket.on('error', (...args) => this.emit('ipc-error', ...args));
        this.socket.on('disconnect', (...args) => this.handleDisconnect(...args));
        this.socket.on('response', (...args) => this.handleResponse(...args));
        this.socket.on('request', (...args) => this.handleRequest(...args));
        this.socket.on('connect', (...args) => this.handleConnect(...args));
        super.start();
        this.startingPromise.resolve();
      });
      this.ipc.connectTo(this.id, () => this._startCb ? setImmediate(() => this._startCb()) : null);
    }).finally(() => {
      this.startingPromise = null;
    });
    this.startingPromise.promise = promise;
    return promise;
  }

  stop () {
    if (this.startingPromise) {
      this.setStartCb(() => {
        this.ipc.disconnect(this.id);
      });
      this.startingPromise.reject(new AbortedError('Client got stopped before properly starting'));
      return Promise.resolve();
    }
    if (!this.started) return Promise.resolve();
    this.ipc.disconnect(this.id);
    return super.stop();
  }
}

module.exports = Client;
