class IpcError extends Error {}
Reflect.defineProperty(IpcError.prototype, 'name', {
  get () {
    return this.constructor.name;
  }
});
IpcError.prototype.code = 'ERR_IPC_GENERIC';

class MissingClientError extends IpcError {}
MissingClientError.prototype.code = 'ERR_IPC_MISSING_CLIENT';

class MissingRouteError extends IpcError {}
MissingRouteError.prototype.code = 'ERR_IPC_MISSING_ROUTE';

class RequestTimeoutError extends IpcError {}
RequestTimeoutError.prototype.code = 'ERR_IPC_REQUEST_TIMEOUT';

class MalformedResponseError extends IpcError {}
MalformedResponseError.prototype.code = 'ERR_IPC_MALFORMED_RESPONSE';

class DisconnectedError extends IpcError {}
DisconnectedError.prototype.code = 'ERR_IPC_DISCONNECTED';

class RequestError extends IpcError {
  constructor (err, ctx) {
    if (err instanceof Error) {
      super(err.message);
      if (err.name !== Error.prototype.name && err.name !== this.constructor.name) {
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
        /*
        Define as getter as there's no need to parse the template string
        until the stacktrace is generated.
        */
        Object.defineProperty(ctx, 'name', {
          get () {
            return `${this.name}${this.originalName ? '<' + this.originalName + '>'
              : ''}${ctx.resource ? ` (While fetching resource: '${ctx.resource}')` : ''}`;
          }
        });

        Object.defineProperty(ctx, 'message', {
          get () {
            return `${this.message}${'code' in this ? ` (code: '${this.code}')` : ''}`;
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
  RequestTimeoutError,
  MalformedResponseError,
  DisconnectedError,
  RequestError
};
