const { RequestError } = moduleUnderTest;

describe('IpcErrors', function () {
  describe('RequestError', function () {
    it('empty', function () {
      return (() => new RequestError()).should.not.throw();
    });
    it('string', function () {
      return (() => new RequestError('message')).should.not.throw();
    });
    it('object - wrong type', function () {
      return new RequestError({prop: 'value'}).should.include({name: 'RequestError', message: 'Unknown error'});
    });
    it('object - correct type', function () {
      return new RequestError({name: 'TestError', message: 'TestMessage', code: 'TestCode'}).should.include({name: 'RequestError', originalName: 'TestError', message: 'TestMessage', code: 'TestCode'});
    });
    it('error - default', function () {
      const err = new Error('TestError');
      return new RequestError(err).should.include({name: 'RequestError', message: 'TestError'});
    });
    it('error - custom', function () {
      class CustomError extends Error {}
      CustomError.prototype.code = 'CUSTOM_ERROR';
      Object.defineProperty(CustomError.prototype, 'name', {
        get () {
          return this.constructor.name;
        }
      });
      const err = new CustomError('TestError');
      return new RequestError(err).should.include({name: 'RequestError', originalName: 'CustomError', message: 'TestError', code: 'CUSTOM_ERROR'});
    });
    it('with context - resource', function () {
      const ctx = {
        resource: 'TestResource'
      };
      new RequestError('TestError', ctx).should.include({name: 'RequestError', message: 'TestError', resource: ctx.resource});
      return ctx.should.not.include(['name', 'message']);
    });
    it('with context - stack (bare)', function () {
      const ctx = {};
      Error.captureStackTrace(ctx);
      const err = new RequestError('TestError', ctx);
      ctx.should.include({name: err.name, message: err.message});
      (() => err.stack).should.not.throw();
    });
    it('with context - stack (full)', function () {
      const ctx = {resource: 'TestResource'};
      Error.captureStackTrace(ctx);
      const err = new RequestError({name: 'TestError', message: 'TestMessage', code: 'TestCode'}, ctx);
      ctx.should.have.property('name').that.has.string(err.name).and.has.string(err.originalName).and.has.string(err.resource);
      ctx.should.have.property('message').that.has.string(err.message).and.has.string(err.code);
      (() => err.stack).should.not.throw();
    });
  });
});
