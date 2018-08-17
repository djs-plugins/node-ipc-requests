
/**
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html}
 */

const IpcClient = require('./client');
const IpcServer = require('./server');
const IpcServerClient = require('./serverClient');
const IpcSingleClientServer = require('./singleClientServer');
const IpcBase = require('./base');
const IpcRequestResponse = require('./requestResponse');
const IpcRouter = require('./router');
const errors = require('./errors');

module.exports = {
  IpcClient,
  IpcServer,
  IpcServerClient,
  IpcSingleClientServer,
  IpcBase,
  IpcRequestResponse,
  IpcRouter,
  ...errors
};
