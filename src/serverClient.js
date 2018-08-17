const RequestResponse = require('./requestResponse');
const { DisconnectedError, InvalidMethodError } = require('./errors');

class ServerClient extends RequestResponse {
  constructor (ipc, socket, options, router) {
    super(ipc, options, router);
    this.socket = socket;
    socket.on('error', (...args) => this.emit('ipc-error', ...args));
    socket.on('close', (...args) => this.handleDisconnect(...args));
    super.start();
    this.handleConnect();
  }

  send (event, data) {
    if (!this.socket) throw new DisconnectedError('Attempted to send data on a closed socket.');
    this.ipc.server.emit(this.socket, event, data);
  }

  start () {
    if (this.started) return Promise.resolve();
    throw new InvalidMethodError('Cannot restart a server client. Connection must be re-established from the clients end.');
  }

  handleDisconnect () {
    super.handleDisconnect();
    this.stop();
  }

  stop () {
    if (!this.started) return Promise.resolve();
    this.socket.destroy();
    this.socket = null;
    return super.stop();
  }

  request (resource, body) {
    if (!this.connected) {
      return Promise.reject(new DisconnectedError('IPC client is disconnected.'));
    }
    return super.request(resource, body);
  }
}

module.exports = ServerClient;
