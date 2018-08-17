const IpcBase = require('./base');
const IpcRouter = require('./router');
const { MalformedResponseError, TimeoutError, AbortedError, DisconnectedError, RequestError, MethodNotImplementedError } = require('./errors');
const ABORTED_ERROR = Symbol('ABORTED_ERROR');

let sequence = 0;

/**
 * @typedef {object} IpcOptions
 * @property {number} [timeout=5000] How long to wait until timing out a request without a response
 */

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
    this.requests = new Map();
    this.queue = [];
    this.router = router || new IpcRouter();
    this.connected = false;
    this.started = false;
    this.startPromises = new Map();
  }

  send () {
    throw new MethodNotImplementedError(`${this.constructor.name} does not implement the send method.`);
  }

  start () {
    this.started = true;
    this.emit('start');
  }

  stop () {
    this.stopped = true;
    for (const [, {reject}] of this.startPromises) {
      reject(ABORTED_ERROR);
    }
    this.emit('stop');
  }

  awaitStart (timeout = null) {
    if (this.connected) return Promise.resolve();

    const timeoutErr = new TimeoutError('Failed to connect within the specified timeframe.');
    Error.captureStackTrace(timeoutErr, this.awaitStart);

    const abortErr = new AbortedError('Connection aborted before being established.');
    Error.captureStackTrace(abortErr, this.awaitStart);
    let resolveReject;
    const promise = new Promise((resolve, reject) => {
      resolveReject = {resolve, reject};
      const cb = () => {
        clearTimeout(_timeout);
        resolve();
      };
      const _timeout = timeout ? setTimeout(() => {
        this.off('connect', cb);
        reject(timeoutErr);
        this.stop();
      }, timeout) : null;
      this.once('connect', cb);
      this.start();
    });
    this.startPromises.set(promise, resolveReject);
    return promise.then(res => {
      this.startPromises.delete(promise);
      return res;
    }, err => {
      this.startPromises.delete(promise);
      if (err === ABORTED_ERROR) err = abortErr;
      throw err;
    });
  }

  async handleRequest (req) {
    let response;
    try {
      response = await this.router.route(req.resource, req.body, req);
    } catch (err) {
      this.send('response', {
        requestId: req.requestId,
        status: 'error',
        error: parseError(err)
      });
      this.emit('requestError', err);
      return;
    }
    this.send('response', {
      requestId: req.requestId,
      status: 'success',
      body: response
    });
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
    if (!this.requests.has(data.requestId)) {
      this.emit('warn', 'Got response with no promise attached to the requestId. Perhaps the request already timed out? requestId: ' + data.requestId);
      return;
    }
    const { resolve, reject } = this.requests.get(data.requestId);
    if (data.status === 'error') {
      reject(data.error);
    } else if (data.status === 'success') {
      resolve(data.body);
    } else {
      reject(new MalformedResponseError('Invalid status on response'));
    }
  }

  handleConnect () {
    this.connected = true;
    const oldQueue = this.queue;
    this.queue = [];
    for (const args of oldQueue) {
      this.makeRequest(...args);
    }
    this.emit('connect');
  }

  handleDisconnect () {
    this.connected = false;
    for (const { onDc } of this.requests.values()) {
      onDc(new DisconnectedError('IPC client disconnected during request'));
    }
    this.emit('disconnect');
  }

  retry (requestId, ...args) {
    if (this.requests.has(requestId)) {
      this.makeRequest(...args);
    }
  }

  makeRequest (data, retry, resolve, reject) {
    if (!this.requests.has(data.requestId)) {
      const timeout = this.options.timeout
        ? setTimeout(() => reject(new TimeoutError(`Request timed out after ${this.options.timeout}ms`)), this.options.timeout)
        : null;
      this.requests.set(data.requestId, {
        resolve,
        reject,
        timeout,
        onDc: retry ? () => this.retry(data.requestId, ...arguments) : err => reject(err)
      });
    }
    if (!this.connected) {
      this.queue.push([...arguments]);
    }
    this.send('request', data);
  }

  request (resource, body, retry = false) {
    const data = {
      resource,
      requestId: String(++sequence),
      body: body
    };

    const context = {resource};
    Error.captureStackTrace(context, this.request);

    const promise = new Promise((resolve, reject) => {
      this.makeRequest(data, retry, resolve, reject);
    }).then(res => {
      const { timeout } = this.requests.get(data.requestId);
      clearTimeout(timeout);
      this.requests.delete(data.requestId);
      return res;
    }, err => {
      const { timeout } = this.requests.get(data.requestId);
      clearTimeout(timeout);
      this.requests.delete(data.requestId);
      throw new RequestError(err, context);
    });
    return promise;
  }
}

module.exports = IpcRequestResponse;
