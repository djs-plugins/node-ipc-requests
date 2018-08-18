const IpcBase = require('./base');
const Router = require('./router');
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
  parsedError.name = error.name;
  if ('code' in error) parsedError.code = error.code;

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
    this.router = router || new Router();
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
    return Promise.resolve();
  }

  stop () {
    this.stopped = true;
    for (const [, {reject}] of this.startPromises) {
      reject(ABORTED_ERROR);
    }
    this.emit('stop');
    return Promise.resolve();
  }

  awaitConnection (timeout = null) {
    if (this.connected) return Promise.resolve();

    const timeoutErr = new TimeoutError('Failed to connect within the specified timeframe.');
    Error.captureStackTrace(timeoutErr, this.awaitConnection);

    const abortErr = new AbortedError('Connection aborted before being established.');
    Error.captureStackTrace(abortErr, this.awaitConnection);

    let resolveReject;
    const basePromise = new Promise((resolve, reject) => {
      resolveReject = {resolve, reject};
      this.once('connect', () => resolve());
      this.start().catch(err => {
        if (err instanceof AbortedError) return reject(ABORTED_ERROR);
        throw err;
      });
    });

    this.startPromises.set(basePromise, resolveReject);

    const promise = basePromise.then(res => {
      this.startPromises.delete(basePromise);
      return res;
    }, err => {
      this.startPromises.delete(basePromise);
      if (err === ABORTED_ERROR) err = abortErr;
      throw err;
    });

    if (timeout) {
      return Promise.race([promise,
        new Promise((resolve, reject) => setTimeout(() => reject(timeoutErr), timeout))]);
    }
    return promise;
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

  makeRequest (data, resolve, reject) {
    if (!this.requests.has(data.requestId)) {
      const timeout = this.options.timeout
        ? setTimeout(() => reject(new TimeoutError(`Request timed out after ${this.options.timeout}ms`)), this.options.timeout)
        : null;
      this.requests.set(data.requestId, {
        resolve,
        reject,
        timeout,
        onDc: err => reject(err)
      });
    }
    if (!this.connected) {
      this.queue.push([...arguments]);
    } else {
      this.send('request', data);
    }
  }

  request (resource, body) {
    const data = {
      resource,
      requestId: String(++sequence),
      body: body
    };

    const context = {resource};
    Error.captureStackTrace(context, this.request);

    const promise = new Promise((resolve, reject) => {
      this.makeRequest(data, resolve, reject);
    }).catch(err => {
      throw new RequestError(err, context);
    }).finally(() => {
      const { timeout } = this.requests.get(data.requestId);
      clearTimeout(timeout);
      this.requests.delete(data.requestId);
    });
    return promise;
  }
}

module.exports = IpcRequestResponse;
