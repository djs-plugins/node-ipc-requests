module.exports = function cleanup () {
  this.beforeEach(function () {
    this.server = null;
    this.client = null;
    this.clients = [];
  });
  this.afterEach(function () {
    if (this.server) {
      this.server.stop();
    }
    if (this.client && !this.clients.includes(this.client)) {
      this.clients.push(this.client);
    }
    for (const client of this.clients) {
      client.stop();
    }
  });
};
