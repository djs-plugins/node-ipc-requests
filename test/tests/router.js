const { Router, MissingRouteError } = moduleUnderTest;

describe('Router', function () {
  it('constructor', function () {
    return (() => new Router()).should.not.throw();
  });
  describe('addRoute', function () {
    it('valid - function handler', function () {
      const router = new Router();
      return (() => router.addRoute('route', () => {})).should.not.throw();
    });
    it('valid - object handler', function () {
      const router = new Router();
      const handler = {
        onRoute () {}
      };
      return (() => router.addRoute('route', handler)).should.not.throw();
    });
    it('invalid - resource', function () {
      const router = new Router();
      return (() => router.addRoute({}, () => {})).should.throw(TypeError);
    });
    it('invalid - handler', function () {
      const router = new Router();
      return (() => router.addRoute('route', {})).should.throw(TypeError);
    });
  });
  describe('routing', function () {
    it('missing route', function () {
      const router = new Router();
      return router.route('missing').should.be.rejectedWith(MissingRouteError);
    });
    it('valid route - function handler', function () {
      const router = new Router();
      router.addRoute('func', () => 'response');
      return router.route('func').should.eventually.be.equal('response');
    });
    it('valid route - object handler', function () {
      const router = new Router();
      const handler = {
        prop: { test: 'test' },
        onRoute () {
          return this.prop;
        }
      };
      router.addRoute('func', handler);
      return router.route('func').should.eventually.be.equal(handler.prop);
    });
    it('removed route', function () {
      const router = new Router();
      router.addRoute('removed', () => 'response');
      router.removeRoute('removed');
      return router.route('removed').should.be.rejectedWith(MissingRouteError);
    });
    it('route on parent', function () {
      const parent = new Router();
      const router = new Router();
      router.parent = parent;
      parent.addRoute('parentRoute', () => 'response');
      return router.route('parentRoute').should.eventually.be.equal('response');
    });
    it('missing route with parent', function () {
      const parent = new Router();
      const router = new Router();
      router.parent = parent;
      return router.route('missingroute').should.be.rejectedWith(MissingRouteError);
    });
    it('route on child', function () {
      const parent = new Router();
      const router = new Router();
      router.parent = parent;
      router.addRoute('childRoute', () => 'response');
      return router.route('childRoute').should.eventually.be.equal('response');
    });
    it('duplicate route on parent', function () {
      const parent = new Router();
      const router = new Router();
      router.parent = parent;
      parent.addRoute('dupeRoute', () => 'parent response');
      router.addRoute('dupeRoute', () => 'child response');
      return router.route('dupeRoute').should.eventually.be.equal('child response');
    });
  });
});
