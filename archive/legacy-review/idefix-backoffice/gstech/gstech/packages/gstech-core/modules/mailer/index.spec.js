/* @flow */
const mailEmu = require('./mailEmu');
const mailer = require('./index');

describe('Mailer', () => {
  it('can send email', async () => {
    mailEmu.registerReceiver((email) => {
      expect(email).to.containSubset({
        to: 'test@luckydino.com',
        text: 'test',
      });
    });

    await mailer.sendMail({ from: 'no-replay@luckydino.com', to: 'test@luckydino.com', subject: 'subject', text: 'test' });
  });
});
