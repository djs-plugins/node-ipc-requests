class IpcError extends Error {}
Object.defineProperty(IpcError.prototype, 'name', {
  get () {
    return this.constructor.name;
  }
});

class MissingClientError extends IpcError {}
MissingClientError.prototype.code = 'ERR_IPC_MISSING_CLIENT';

class MissingRouteError extends IpcError {}
MissingRouteError.prototype.code = 'ERR_IPC_MISSING_ROUTE';

class TimeoutError extends IpcError {}
TimeoutError.prototype.code = 'ERR_IPC_REQUEST_TIMEOUT';

class MalformedResponseError extends IpcError {}
MalformedResponseError.prototype.code = 'ERR_IPC_MALFORMED_RESPONSE';

class DisconnectedError extends IpcError {}
DisconnectedError.prototype.code = 'ERR_IPC_DISCONNECTED';

class AbortedError extends IpcError {}
AbortedError.prototype.code = 'ERR_IPC_DISCONNECTED';

class MethodNotImplementedError extends IpcError {}
MethodNotImplementedError.prototype.code = 'ERR_IPC_METHOD_NOT_IMPLEMENTED';

class InvalidMethodError extends IpcError {}
InvalidMethodError.prototype.code = 'ERR_IPC_INVALID_METHOD';

class RequestError extends IpcError {
  constructor (err, ctx) {
    if (typeof err === 'object') {
      super('message' in err ? err.message : 'Unknown error');
      if (err.name && err.name !== Error.prototype.name && err.name !== this.constructor.name) {
        Object.defineProperty(this, 'originalName', {
          value: err.name
        });
      }
      if ('code' in err) {
        this.code = err.code;
      }
    } else {
      super(err);
    }

    if (ctx) {
      if (ctx.resource) {
        Object.defineProperty(this, 'resource', {
          value: ctx.resource
        });
      }
      if ('stack' in ctx) {
        const self = this;
        /*
        Define as getter as there's no need to parse the template string
        until the stacktrace is generated.
        */
        Object.defineProperty(ctx, 'name', {
          get () {
            return `${self.name}${self.originalName ? '<' + self.originalName + '>'
              : ''}${ctx.resource ? ` (While fetching resource: '${ctx.resource}')` : ''}`;
          }
        });

        Object.defineProperty(ctx, 'message', {
          get () {
            return `${self.message}${'code' in self ? ` (code: '${self.code}')` : ''}`;
          }
        });

        Object.defineProperty(this, 'stack', {
          get () {
            return ctx.stack;
          }
        });
      }
    }
  }
}

module.exports = {
  IpcError,
  MissingClientError,
  MissingRouteError,
  TimeoutError,
  MalformedResponseError,
  DisconnectedError,
  RequestError,
  MethodNotImplementedError,
  InvalidMethodError,
  AbortedError
};
