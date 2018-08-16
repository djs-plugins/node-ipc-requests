const IpcRequestResponse = require('../requestResponse');
const { IpcDisconnectedError } = require('../errors');

class IpcSingleClientServer extends IpcRequestResponse {
  constructor (id, options, router) {
    options = (options || {}).maxConnections = 1;
    super(id, options, router);
    const { socketRoot, appspace } = this.ipc.config;
    const servePath = socketRoot + appspace + id;
    this.ipc.serve(servePath, () => this.emit('started'));
    this.ipc.server.on('request', (data, socket) => {
      if (socket !== this.socket) {
        this.emit('warn', 'Got request from wrong client. Dropping request');
        return;
      }
      this.handleRequest(data);
      this.emit('request', data, socket);
    });
    this.ipc.server.on('response', (data, socket) => {
      if (socket !== this.socket) {
        this.emit('warn', 'Got response from wrong client. Dropping request');
        return;
      }
      this.handleResponse(data);
      this.emit('response', data, socket);
    });
    this.ipc.server.on('connect', (...args) => { this.handleConnect(...args); });
    this.socket = null;
    this.sendRequest = sendData => this.ipc.server.emit(this.socket, 'request', sendData);
    this.sendResponse = sendData => this.ipc.server.emit(this.socket, 'response', sendData);
  }

  get connected () {
    return Boolean(this.socket);
  }

  start () {
    this.ipc.server.start();
  }

  stop () {
    this.ipc.server.stop();
  }

  async handleConnect (socket) {
    if (this.socket) {
      socket.close();
      this.emit('warn', 'Second client tried to connect to single client server.');
    }
    this.socket = socket;
    this.emit('connect');
    socket.once('close', () => {
      for (const { reject } of this.promises) {
        reject(new IpcDisconnectedError('IPC client disconnected during request'));
      }
      this.socket = null;
      this.emit('disconnect');
    });
  }

  async handleRequest (req) {
    super.handleRequest(req, this.sendResponse);
    this.emit('request', req);
  }

  request (resource, data) {
    return super.request(resource, data, this.sendRequest);
  }
}

module.exports = IpcSingleClientServer;
