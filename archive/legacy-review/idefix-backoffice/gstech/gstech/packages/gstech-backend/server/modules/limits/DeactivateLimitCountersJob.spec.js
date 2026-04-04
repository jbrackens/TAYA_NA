/* @flow */
const DeactivateLimitCountersJob = require('./DeactivateLimitCountersJob');

describe('DeactivateLimitCountersJob', function test(this: $npm$mocha$ContextDefinition) {
  this.timeout(30000);

  it('deactivate expired limit counters', async () => {
    // TODO: maybe this test could actually test something
    await DeactivateLimitCountersJob.update();
  });
});
