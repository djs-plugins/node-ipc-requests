const IpcRequestResponse = require('../requestResponse');
const { IpcDisconnectedError } = require('../errors');

class IpcServerClient extends IpcRequestResponse {
  constructor (ipc, socket, options, router) {
    super(ipc, options, router);
    this.connected = true;
    this.socket = socket;
    socket.on('error', (...args) => this.emit('ipc-error', ...args));
    socket.on('close', (...args) => { this.handleDisconnect(...args); this.emit('disconnect', ...args); });
    this.sendRequest = sendData => this.ipc.server.emit(socket, 'request', sendData);
    this.sendResponse = sendData => this.ipc.server.emit(socket, 'response', sendData);
  }

  async handleRequest (req) {
    super.handleRequest(req, this.sendResponse);
    this.emit('request', req);
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

module.exports = IpcServerClient;
