const IpcBase = require('./base');
const IpcRouter = require('./router');
const { MalformedResponseError, RequestTimeoutError, IpcDisconnectedError, RequestError } = require('./errors');

let sequence = 0;

/**
 * @typedef {object} IpcOptions
 * @property {number} [timeout=5000] How long to wait until timing out a request without a response
 */

function buildError (src) {
  if (typeof src === 'object') {
    const error = new Error(src.message, src.name, src.code);
    if (src.hasOwnProperty('code')) error.code = src.code;
    if (src.hasOwnProperty('name')) error.name = src.code;
    return error;
  }
  if (typeof src === 'string') {
    return new Error(src);
  }
  return new Error('Unknown Request Error');
}

function parseError (error) {
  if (!(error instanceof Error)) {
    throw new TypeError('Can\'t parse a non-error object');
  }
  const parsedError = {
    message: error.message
  };
  if (!(error instanceof RequestError) && error.name !== Error.prototype.name) parsedError.name = error.name;
  if (error.hasOwnProperty('code')) parsedError.code = error.code;

  return parsedError;
}

/**
 * Class for handling request and responses
 * @extends IpcBase
 */
class IpcRequestResponse extends IpcBase {
  constructor (id, options, router) {
    super(id, options);
    this.promises = new Map();
    this.router = router || new IpcRouter();
  }

  async handleRequest (req, send) {
    try {
      const response = await this.router.route(req.resource, req.body, req);
      send({
        requestId: req.requestId,
        status: 'success',
        body: response
      });
    } catch (err) {
      send({
        requestId: req.requestId,
        status: 'error',
        error: parseError(err)
      });
      this.emit('requestError', err);
    }
  }

  handleResponse (data) {
    if (typeof data !== 'object') {
      this.emit('error', new MalformedResponseError('Got response with non-object data'));
      return;
    }
    if (typeof data.requestId !== 'string') {
      this.emit('error', new MalformedResponseError('Got response with non-string requestId'));
      return;
    }
    if (!this.promises.has(data.requestId)) {
      this.emit('warn', 'Got response with no promise attached to the requestId. Perhaps the request already timed out? requestId: ' + data.requestId);
      return;
    }
    const { resolve, reject } = this.promises.get(data.requestId);
    if (data.status === 'error') {
      reject(buildError(data.error));
    } else if (data.status === 'success') {
      resolve(data.body);
    } else {
      reject(new MalformedResponseError('Invalid status on response'));
    }
  }

  request (resource, body, send) {
    if (!this.connected) {
      return Promise.reject(new IpcDisconnectedError('IpcClient is not connected'));
    }
    const data = {
      resource,
      requestId: String(++sequence),
      body: body
    };

    const context = {resource};
    Error.captureStackTrace(context, this.request);

    const promise = new Promise((resolve, reject) => {
      this.promises.set(data.requestId, {
        resolve,
        reject,
        timeout: setTimeout(() => reject(new RequestTimeoutError(`Request timed out after ${this.options.timeout}ms`)), this.options.timeout)
      });
    }).then(res => {
      const { timeout } = this.promises.get(data.requestId);
      clearTimeout(timeout);
      this.promises.delete(data.requestId);
      return res;
    }, err => {
      const { timeout } = this.promises.get(data.requestId);
      clearTimeout(timeout);
      this.promises.delete(data.requestId);
      throw new RequestError(err, context);
    });
    send(data);
    return promise;
  }
}

module.exports = IpcRequestResponse;
