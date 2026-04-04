/* @flow */
const getJurisdiction = (req: express$Request): string => {
  if (req.context.countryISO === 'DE' || (req.user && req.user.details.CountryISO === 'DE')) {
    return 'GNRS';
  }
  return 'MGA';
}

module.exports = { getJurisdiction };