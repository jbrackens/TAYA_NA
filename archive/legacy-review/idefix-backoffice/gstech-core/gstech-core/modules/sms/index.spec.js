/* @flow */
const phoneEmu = require('./phoneEmu');
const sms = require('./index');

describe('SMS', () => {
  it('can send sms', async () => {
    phoneEmu.registerSmsReceiver((smsMessage) => {
      expect(smsMessage).to.containSubset({
        to: '490394573231',
        message: 'test',
      });
    });

    const result = await sms.send('490394573231', 'test');
    expect(result).to.containSubset({ ok: true, message: 'SMS has been sent using phoneEmu' });
  });
});
