
/**
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html}
 */

const Client = require('./client');
const Server = require('./server');
const ServerClient = require('./serverClient');
const SingleClientServer = require('./singleClientServer');
const IpcBase = require('./base');
const RequestResponse = require('./requestResponse');
const Router = require('./router');
const errors = require('./errors');

module.exports = {
  Client,
  Server,
  ServerClient,
  SingleClientServer,
  IpcBase,
  RequestResponse,
  Router,
  ...errors
};
