const IpcRequestResponse = require('../requestResponse');
const { IpcDisconnectedError } = require('../errors');

class IpcClient extends IpcRequestResponse {
  constructor (id, options, router) {
    super(id, options, router);
    this.ipc.connectTo(id);
    this.connected = false;
    this.socket = this.ipc.of[id];
    this.socket.on('error', (...args) => this.emit('ipc-error', ...args));
    this.socket.on('disconnect', (...args) => { this.handleDisconnect(...args); this.emit('disconnect', ...args); });
    this.socket.on('response', (...args) => { this.handleResponse(...args); this.emit('response', ...args); });
    this.socket.on('connect', (...args) => { this.handleConnect(...args); this.emit('connect', ...args); });
    this.sendRequest = sendData => this.socket.emit('request', sendData);
    this.sendResponse = sendData => this.socket.emit('response', sendData);
  }

  async handleRequest (req) {
    return super.handleRequest(req, this.sendResponse);
  }

  handleConnect () {
    this.connected = true;
  }

  handleDisconnect () {
    this.connected = false;
    for (const { reject } of this.promises) {
      reject(new IpcDisconnectedError('IPC client disconnected during request'));
    }
  }

  request (resource, data) {
    return super.request(resource, data, this.sendRequest);
  }
}

module.exports = IpcClient;
