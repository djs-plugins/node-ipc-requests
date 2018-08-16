const IPC = require('node-ipc/services/IPC');
const EventEmitter = require('events');

const ipcConfigKeys = [
  'appspace',
  'socketRoot',
  'networkHost',
  'networkPort',
  'encoding',
  'rawBuffer',
  'delimiter',
  'sync',
  'silent',
  'logInColor',
  'logDepth',
  'logger',
  'maxConnections',
  'retry',
  'maxRetries',
  'stopRetrying',
  'unlink',
  'interfaces'
];

const defaultIpcConf = {
  silent: true
};

const defaultOptions = {
  timeout: 5000
};
/**
 * @typedef {object} IpcOptions
 * @property {number} [timeout=5000] How long to wait until timing out a request without a response
 */

/**
 * Base IPC class
 * @extends EventEmitter
 */
class IpcBase extends EventEmitter {
  constructor (id, options) {
    if (typeof id !== 'string' && !(id instanceof IPC)) {
      throw new TypeError('id must be string or IPC instance');
    }
    super();
    options = options || {};
    const ipcConfig = {};
    for (const key in options) {
      if (ipcConfigKeys.includes(key)) {
        ipcConfig[key] = options[key];
        delete options[key];
      }
    }
    if (id instanceof IPC) {
      this.ipc = id;
    } else {
      this.ipc = new IPC();
      Object.assign(this.ipc.config, { id }, defaultIpcConf, ipcConfig);
    }
    this.options = Object.assign({}, defaultOptions, options);
  }
}

module.exports = IpcBase;
