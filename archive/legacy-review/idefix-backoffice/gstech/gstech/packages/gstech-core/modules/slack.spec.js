/* @flow */
const {
  testMessage,
} = require('./slack');

describe('Slack', () => {
  it('can send test message', async () => {
    testMessage('Test Sender', 'This is a test message');
  });
});
