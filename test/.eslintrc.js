// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  env: {
    node: true,
    mocha: true,
  },
  globals: {
    'should': false,
    'baseConstructorTests': false,
    'moduleUnderTest': false,
  },
  extends: [
      // https://github.com/standard/standard/blob/master/docs/RULES-en.md
      'semistandard'
  ],
  // add your custom rules here
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    'no-unused-expressions': 'off'
  }
}
