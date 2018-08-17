const { MissingRouteError } = require('./errors');

class IpcRouter {
  constructor () {
    this.routes = new Map();
    this.parent = null;
  }

  addRoute (route, handler) {
    if (typeof route !== 'string') {
      throw new TypeError('route must be a string');
    }
    if (typeof handler.onRoute === 'function') {
      handler = handler.onRoute.bind(handler);
    }
    if (typeof handler !== 'function') {
      throw new TypeError('Handler must be a function or object with an onRoute method');
    }
    this.routes.set(route, handler);
  }

  removeRoute (route) {
    this.routes.delete(route);
  }

  async route (resource, ...args) {
    const handler = this.routes.get(resource);
    if (!handler && !this.parent) throw new MissingRouteError(`resource ${resource} is not registered in the router`);
    if (!handler) return this.parent.route(resource, ...args);
    return handler(...args);
  }
}

module.exports = IpcRouter;
