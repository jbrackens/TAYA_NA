/* @flow */
const { handleError } = require('../extensions');
const { updateProfile, updateProfileRealityCheck } = require('./player');
const { getDetails } = require('./legacy-player');
const utils = require('../utils');

const getProfile = async (req: express$Request): Promise<{profile: any}> => {
    const x = await getDetails(req);
    const profile: any = utils.pluckAll(x, 'Address1', 'FirstName', 'LastName', 'EmailAddress', 'PostCode', 'City', 'LanguageISO', 'MobilePhone', 'CountryISO', 'CurrencyISO', 'Pnp', 'RealityCheckMinutes');
    profile.Country = utils.countryForISO(profile.CountryISO);
    return { profile };
  };

const getProfileHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
    try {
      const profile = await getProfile(req);
      return res.json(profile);
    } catch (e) {
      return handleError(req, res, e);
    }
  };

const updateProfileHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
try {
    await updateProfile(req, req.body);
    const profile = await getProfile(req);
    return res.json(profile);
} catch (e) {
    return handleError(req, res, e);
}
};

const updateRealityCheckHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    await updateProfileRealityCheck(req, req.body);
    const profile = await getProfile(req);
    return res.json(profile);
  } catch (e) {
    return handleError(req, res, e);
  }
};

module.exports = {
  getProfileHandler,
  updateProfileHandler,
  getProfile,
  updateRealityCheckHandler,
};