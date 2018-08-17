const IpcRequestResponse = require('./requestResponse');
const { DisconnectedError } = require('./errors');

class IpcClient extends IpcRequestResponse {
  get socket () {
    return this.ipc.of[this.id];
  }

  send (event, data) {
    if (!this.connected) throw new DisconnectedError('Attempting to send when client is disconnected');
    this.socket.emit(event, data);
  }

  start () {
    if (this.started) return Promise.resolve();
    this.ipc.connectTo(this.id);
    this.socket.on('error', (...args) => this.emit('ipc-error', ...args));
    this.socket.on('disconnect', (...args) => this.handleDisconnect(...args));
    this.socket.on('response', (...args) => this.handleResponse(...args));
    this.socket.on('connect', (...args) => this.handleConnect(...args));
    super.start();
  }

  stop () {
    this.ipc.disconnect(this.id);
    super.stop();
  }
}

module.exports = IpcClient;
