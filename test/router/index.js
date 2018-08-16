const { IpcRouter, MissingRouteError } = moduleUnderTest;

describe('router', function () {
  it('constructor', function () {
    return (() => new IpcRouter()).should.not.throw();
  });
  describe('addRoute', function () {
    it('valid - function handler', function () {
      const router = new IpcRouter();
      return (() => router.addRoute('route', () => {})).should.not.throw();
    });
    it('valid - object handler', function () {
      const router = new IpcRouter();
      const handler = {
        onRoute () {}
      };
      return (() => router.addRoute('route', handler)).should.not.throw();
    });
    it('invalid - resource', function () {
      const router = new IpcRouter();
      return (() => router.addRoute({}, () => {})).should.throw(TypeError);
    });
    it('invalid - handler', function () {
      const router = new IpcRouter();
      return (() => router.addRoute('route', {})).should.throw(TypeError);
    });
  });
  describe('routing', function () {
    it('missing route', function () {
      const router = new IpcRouter();
      return (() => router.route('missing')).should.throw(MissingRouteError);
    });
    it('valid route - function handler', function () {
      const router = new IpcRouter();
      router.addRoute('func', () => 'response');
      return router.route('func').should.be.equal('response');
    });
    it('valid route - object handler', function () {
      const router = new IpcRouter();
      const handler = {
        prop: { test: 'test' },
        onRoute () {
          return this.prop;
        }
      };
      router.addRoute('func', handler);
      return router.route('func').should.be.equal(handler.prop);
    });
    it('removed route', function () {
      const router = new IpcRouter();
      router.addRoute('removed', () => 'response');
      router.removeRoute('removed');
      return (() => router.route('removed')).should.throw(MissingRouteError);
    });
  });
});
