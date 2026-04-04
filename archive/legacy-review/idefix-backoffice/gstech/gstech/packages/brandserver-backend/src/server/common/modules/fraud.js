/* @flow */
import type { Player } from '../api';

const encrypt = require('../encrypt');
const api = require('../api');
const configuration = require('../configuration');

const ENC_KEY = 'r89HM6eobwpVZuuv93';

const ignoreCountries = ['FI', 'NO', 'XX', 'MT'];

const fraudCheck = (user: Player, fraudKey: string, fraudId: string, details: any) =>
  user.details != null
  && api.FraudCheck({
    username: user.details.Username,
    fraudKey,
    fraudId,
    details,
  });

const updateFraudStatus = async (req: express$Request, res: express$Response, user: Player) => {
  let previousPhoneNumber;
  const { ldrid2, ldriz } = req.cookies;
  if (ldriz != null) {
    previousPhoneNumber = encrypt.decrypt(ENC_KEY, ldriz);
  }
  res.cookie('ldrid2', encrypt.encrypt(ENC_KEY, user.username), { path: '/', secure: configuration.productionMode(), maxAge: 1000 * 60 * 60 * 3 });

  if (ldrid2) {
    const username = encrypt.decrypt(ENC_KEY, ldrid2);
    if (username) {
      await fraudCheck(user, 'same_browser_registrations', username, { username });
    }
  } else if (previousPhoneNumber != null) {
    await fraudCheck(user, 'registration_phone_number', previousPhoneNumber, { phoneNumber: previousPhoneNumber });
  }
};

const checkFraud = (req: express$Request, res: express$Response, phone: string, error: ?{ ErrorNo: number }) => {
  if (error && error.ErrorNo === 482) {
    // mobile phone already exists
    const { ldrid } = req.cookies;
    if (ldrid == null || ldrid === 'true') {
      res.cookie('ldriz', encrypt.encrypt(ENC_KEY, phone), { path: '/', secure: configuration.productionMode(), maxAge: 1000 * 60 * 60 * 24 * 7 });
    }
  }
};


module.exports = { updateFraudStatus, checkFraud, ignoreCountries };
